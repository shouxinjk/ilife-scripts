// ==UserScript==
// @name         list-京东
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract list
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://*.jd.com/*
// @grant        none
// ==/UserScript==

//示例URL
//https://list.jd.com/list.html?cat=737,738,748

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;

var schema={
//TODO: validate and commit
};

var seed={};
var tags = [];
var index = 0;

var seedTpl = JSON.stringify(
    {//an example for extract urls
        task:{
            user:"userid",//注册的编码
            executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
        },
        source:"jd",
        type:"item",
        rate:{
            percentage:0,
            amount:0
        },
        taskUrl:document.location.href,
        status:"new",
        url:null // by default the url is null
    }
);

(function() {
    'use strict';
    waitForKeyElements ("a[href*='item.jd.com']", item);//采集单个商品页
    waitForKeyElements ("a[href*='list.html']", item);//采集列表页
    //waitForKeyElements (".yx-cp-tabNav-item>a[href*='item/list']", list);//采集列表页面，一般是分页
})();

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

function item(jNode){//采集具体内容条目
    //注意：由于有多个seed，需要重新赋值
    seed=JSON.parse(seedTpl);
    tags = [];
    //是否有标签
    if(jNode.attr("title") && jNode.attr("title").trim().length>2 && jNode.attr("title").trim().length< 8){
        tags.push(jNode.attr("title").trim());
    }
    //获取链接地址
    var link = jNode.attr("href");
    //将tag放入链接地址
    if(link&&link.indexOf("?")>0){
        link = link +"&tags="+tags.join();
    }else{
        link = link +"?tags="+tags.join();
    }
    seed.url = fullUrl(link);

    commit("seed item "+ index);
}

function list(jNode){//采集列表页
    seed=JSON.parse(seedTpl);
    seed.type="list";
    //获取分页/分类地址
    var link = jNode.attr("href");
    seed.url = fullUrl(link);
    commit("seed list "+ index);
}

function url(link){
    return link;
}

//commit data
function commit(key){
    if(validate()){
        if(debug)console.log("validate succeed. try to commit "+key,seed);
        commitUrl(seed);
        index++;
    }else{
        if(debug)console.log("validate failed.[prop]"+key,seed);
    }
}

//validate data collected
function validate(){
    //TODO use json schema to validate data
    return seed.url;
}

//navigate to next url
function next(){
    if(!debug){_next();}
}