// ==UserScript==
// @name         驴妈妈-vacation
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract free tour lines
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://vacations.lvmama.com/w/*
// @grant        none
// ==/UserScript==

//示例URL
//http://vacations.lvmama.com/w/tour/100094726?losc=135331&ict=i

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("lvmama");

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
    url:window.location.href,
    type:"vacation",
    source:"lvmama",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["度假"],
    distributor:{
        name:"驴妈妈"
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
    },
    props:[]
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"lvmama",
    type:"freetour",
    taskUrl:document.location.href,
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements ("title", title);
    waitForKeyElements (".d-tit", summary);
    waitForKeyElements (".d-push", summary);
    waitForKeyElements (".t-category", tags_category);
    waitForKeyElements (".tag-outer em", tags);
    waitForKeyElements (".list-in li img", images);//幻灯图片
    waitForKeyElements (".d-boxc div img", images);//正文图片：风格1
    waitForKeyElements (".detail-instance-body div img", images);//正文图片：风格2
    waitForKeyElements (".remark-percent",rank_score);
    waitForKeyElements ("div.comment-nav",rank_count);
    waitForKeyElements (".total-price",price_sale);
    waitForKeyElements (".d-info dl",props);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function summary(jNode){
    data.summary = data.summary+jNode.text().replace(/\s+/g," ").trim()+"<br/>";
    commit("summary");
}

function tags_category(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags-category");
}

function tags(jNode){
    var lists = jNode.text().trim().split(/、/g);
    for(var i=0;i<lists.length;i++){
        var tag = lists[i].trim();
        if(tag.length>0 && data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
    }
    commit("tags");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var num = jNode.text().match(/\d+\.*\d*/g);//(4.2)
    data.rank.score = Number(num[0]);
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/g);
    data.rank.count = Number(num[0]);
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.text().match(/\d+\.*\d*/g);//(4.2)
    data.price.sale = Number(num[0]);
    commit("price_sale");
}

function props(jNode){
    var key = jNode.find("dt").text().replace(/\s+/g," ").trim();
    var value = jNode.find("dd").text().replace(/\s+/g," ").trim();
    var prop = {
        //key:txt[0],
        //value:txt[1]
    };
    if(key.trim().length>0 && value.trim().length>0){
        prop[key]=value;
        data.props.push(prop);
        commit("props");
    }
}

//由于有不同的地址格式，需要根据url动态拼装
//web: http://vacations.lvmama.com/w/vacation/100038116?losc=135299&ict=i
function web(link){
    return location.protocol+"//"+location.hostname+location.pathname;
    /*
    var line = link.match(/\d+/g);//匹配后返回：429656，13，分别为productID、出发地ID
    var productId = line[0];
    var departure = line.length>1?"?losc="+line[1]:"";
    return "http://vacations.lvmama.com/w/vacation/"+productId+departure;
    //**/
}

//转换为移动链接地址，其中包含两个主要信息：productId和出发地Id
//https://m.lvmama.com/vacations/m/vacation/100038116
function wap(link){
    return "https://m.lvmama.com/vacations"+location.pathname.replace(/\/\w\//,"/m/");
    /**
    var line = link.match(/\d+/g);//匹配后返回：429656，13，分别为productID、出发地ID
    var productId = line[0];
    var departure = line.length>1?"?losc="+line[1]:"";
    return "https://m.lvmama.com/vacations/m/vacation/"+productId+departure;
    //**/
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
        commitTime = new Date().getTime();
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
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    if(!debug)console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}




