// ==UserScript==
// @name         途家-酒店
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract hotel
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.tujia.com/detail/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.tujia.com/detail/1076226.htm?ssr=off
//https://www.tujia.com/detail/1074259.htm?ssr=off

if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

var debug = false;//isProduction("tujia");

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
    type:"hotel",
    source:"tujia",
    title:null,
    summary:"",
    address:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"途家"
    },
    producer:{
        name:""
    },
    seller:{
        name:""
    },
    rank:{
        score:null,
        base:null,
        count:null,
        match:0.75//by default
    },
    link:{
        web:window.location.href,//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    },
    props:[]//key,value键值对
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"tujia",
    type:"hotel",
    taskUrl:document.location.href,
    url:document.location.href
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = null;

(function() {
    'use strict';
    setTimeout(clickImage, 800);//等待0.2秒点击图片
    waitForKeyElements (".title__name", title);
    waitForKeyElements (".unit-description", summary);
    waitForKeyElements (".unit-title__address", address);
    waitForKeyElements (".unit-house-info ul li", tags);
    waitForKeyElements (".unit-image", images_logo);
    waitForKeyElements (".swiper-slide img", images);
    waitForKeyElements (".unit-comment__container__rate__score",rank_score);
    waitForKeyElements (".unit-comment__nav__this",rank_count);
    waitForKeyElements (".unit-price__price--origin",price_bid);
    waitForKeyElements (".common__button_price",price_sale);//由于单晚价格进行加密，需要通过计算得到
    commitUrl(seed);//here is an example
})();

//等待后点击并采集所有图片列表
function clickImage(){
    //点击触发显示图片列表
    var eClick = jQuery.Event( "click" );
    $(".unit-image").trigger( eClick );
    timerId = setInterval(next, 500);//需要设置页面跳转检查
}

function title(jNode){
    data.title = jNode.text();
    commit("title");
}

function summary(jNode){
    data.summary = jNode.text().replace(/\s+/g,"");
    commit("summary");
}

function address(jNode){
    data.address = jNode.text().replace(/地址：/g,"").trim();
    commit("address");
}

function tags(jNode){
    var tag = jNode.attr("title").trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0)
        data.tags.push(tag);
    commit("tags");
}

function images_logo(jNode){
    var img = jNode.attr("style").replace(/background-image: url\("/g,"").replace(/"\);/g,"");//background-image: url("https://pic.tujia.com/upload/landlordunit/day_190525/thumb/201905252104578377_1500_1003.jpg");
    //if(data.images.indexOf(img)<0)
    //    data.images.push(img);
    //commit("images");
    checkImage(img);
}

function images(jNode){
    var img = jNode.attr("src")
    //if(data.images.indexOf(img)<0)
    //    data.images.push(img);
    //commit("images");
    checkImage(img);
}

function rank_score(jNode){
    var score = jNode.text().match(/\d*\.*\d/);
    data.rank.score = Number(score);
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/);
    data.rank.count = Number(num);
    commit("rank_count");
}

function price_bid(jNode){
    var num = jNode.text().match(/\d+\.*\d+/);
    data.price.bid = Number(num);
    commit("price_bid");
}

function price_sale(jNode){
    var num = jNode.text().match(/\d+/g);//立刻预订（1晚¥1288）
    if(num&&num.length>1){
        var price = Number(num[1])/Number(num[0]);
        data.price.sale = Number(price);
        commit("price_sale");
    }
}

function web(link){
    var id = link.match(/\d+/);//10359
    return "https://www.tujia.com/detail/"+id+".htm";
}

//转换为移动链接地址，其中包含两个主要信息：productId和出发地Id
//web: https://www.tujia.com/detail/1074259.htm?ssr=off
//wap: https://m.tujia.com/detail/1074259.htm?ssr=off
function wap(link){
    var id = link.match(/\d+/);//10359
    return "https://m.tujia.com/detail/"+id+".htm";
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
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale && data.tags.length>0;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}

//判定尺寸后提交，需要大于200*200
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=200 && img.height>=200 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=200 && img.height>=200 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}


