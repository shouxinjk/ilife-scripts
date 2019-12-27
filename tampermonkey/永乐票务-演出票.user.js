// ==UserScript==
// @name         永乐票务-演出票
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.228.com.cn/ticket-*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.228.com.cn/ticket-464047878.html

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
    type:"ticket",
    source:"yongle",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"永乐票务"
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
    source:"yongle",
    type:"ticket",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

(function() {
    'use strict';
    waitForKeyElements ("h1.scrolltitle", title);
    waitForKeyElements ("h3:contains('演出详情') + div p", summary);
    waitForKeyElements ("input[id='cityname']",city);
    waitForKeyElements ("input[id='typea1']", tags);
    waitForKeyElements ("label:contains('演出场馆：')",venu);
    waitForKeyElements (".main-l img", images_logo);//logo
    waitForKeyElements (".lhg26 p img", images);//正文部分的图片提取
    //waitForKeyElements ("a.commnet_score",rank_score);//没有评分
    //waitForKeyElements ("span[itemprop='reviewCount']",rank_count);//没有评分
    waitForKeyElements ("li[type='price']:first",price);//取第一个价格
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g,"").trim();
    if(txt.length>0){
        data.summary += jNode.text().replace(/\s+/g,"")+"<br/>";
        commit("summary");
    }
}

function venu(jNode){
    data.venu = jNode.text().replace(/\s+/g,"").replace(/演出场馆：/g,"");
    commit("venu");
}

function tags(jNode){
    var tag=jNode.val();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function city(jNode){
    data.city = jNode.val();
    commit("city");
}

function images_logo(jNode){
    var img = fullUrl(jNode.attr("src"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function images(jNode){
    var img = fullUrl(jNode.attr("data-lazy"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    var score = jNode.attr("title").match(/\d*\.*\d/g);//客户点评：4.2分，总分5分。
    data.rank.score = score[0];
    data.rank.base = score[1];
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d*\.*\d/g);//53位住客点评
    data.rank.count = count[0];
    commit("rank_count");
}

function price(jNode){
    var price = jNode.text().match(/\d+/g);
    data.price.sale = price[0];
    commit("price");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://www.228.com.cn/ticket-464047878.html
function web(link){
    var str = link.match(/\d+.html/)[0];//匹配后返回：464047878.html
    return "https://www.228.com.cn/ticket-"+str;
}

//转换为移动链接地址
//web: https://www.228.com.cn/ticket-464047878.html
//wap: https://m.228.cn/ticket-464047878.html
function wap(link){
    var str = link.match(/\d+.html/)[0];//匹配后返回：464047878.html
    return "https://m.228.cn/ticket-"+str;
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
    return data.title && data.images.length>0 && data.price.sale;
}

//navigate to next url
function next(){
    if(!debug){_next();}
}



