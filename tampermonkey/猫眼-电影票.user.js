// ==UserScript==
// @name         猫眼-电影票
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://maoyan.com/films/*
// @grant        none
// ==/UserScript==

//示例URL
//http://maoyan.com/films/42964

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;

var schema={
//TODO: validate and commit
};

var data={
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    url:web(window.location.href),
    type:"movie",
    source:"maoyan",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"猫眼"
    },
    rank:{
        score:null,
        base:null,
        count:null,
        match:0.75//by default
    },
    link:{
        web:web(window.location.href),//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    }
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"maoyan",
    type:"movie",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

(function() {
    'use strict';
    waitForKeyElements ("h3.name", title);
    waitForKeyElements (".dra", summary);
    waitForKeyElements (".ellipsis", tags);
    waitForKeyElements (".avatar", images);//logo
    //waitForKeyElements (".default-img", images);//正文部分的图片提取
    waitForKeyElements (".info-num .stonefont",rank_score);
    waitForKeyElements (".score-num .stonefont",rank_count);
    //waitForKeyElements (".lst .itm a .price:parent",price);//取第一个价格
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    //console.log("titleEl",$("h2.cn_n"),jNode);
    data.title = jNode.text();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().trim();
    if(txt.length>0){
        data.summary += jNode.text().trim()+"<br/>";
        commit("summary");
    }
}

function tag_category_city(jNode){
    tags(jNode);//处理tags
    tags_category(jNode);//处理分类tags
    city(jNode);//获取演出城市
}

/*
需要进一步处理:对于影片分类使用逗号切分，影片时长使用斜线切分，过长则不作为tag
*/
function tags(jNode){
    var tags = jNode.text().split(/,|\//g);
    for(var i=0;tags&&i<tags.length;i++){
        var tag = tags[i].trim()
        if(tag.trim().length>0 && tag.trim().length<10 && data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
    }
    commit("tags");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    data.rank.score = jNode.text().trim();//4.9
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().trim();//24万
    commit("rank_count");
}

function price(jNode){
    //data.price.bid = jNode.parent().parent().attr("data-price");
    data.price.sale = jNode.parent().parent().attr("data-price");
    commit("price");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
function web(link){
    var id = link.match(/\d+/)[0];//匹配后返回：42964
    return "http://maoyan.com/films/"+id;
}

//转换为移动链接地址
//web: http://maoyan.com/films/42964
//wap: http://m.maoyan.com/movie/42964
function wap(link){
    var id = link.match(/\d+/)[0];//匹配后返回：42964
    return "http://m.maoyan.com/movie/"+id;
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate data collected
function validate(){
    //TODO use json schema to validate data
    return data.title && data.images.length>0;
}

//navigate to next url
function next(){
    if(!debug){_next();}
}



