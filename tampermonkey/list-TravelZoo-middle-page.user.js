// ==UserScript==
// @name         list-TravelZoo-middle-page
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract list
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.travelzoo.com/cn/Deal/Book/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.travelzoo.com/cn/Deal/Book/2740131/
//能够采集到对应的真实网站地址

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
            timestamp:new Date(),//时间戳
            url:window.location.href//原始浏览地址
        },
        source:"from-travelzoo",
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
    waitForKeyElements ("script:contains('setTimeout')", item);//找到对应脚本提取真实地址
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
    //导航作为tag
    jNode.find(".m-crumbs span").each(function( index ) {
        var txt = $( this ).text().trim();
        if(debug){console.log("curmbs link.",index,txt);}
        if(txt.length>0 && tags.indexOf(txt)<0 && ",首页,".indexOf(txt)<0){
            tags.push(txt);
        }
    });
    //获取链接地址
    var link = jNode.text().match(/http[^']+/);
    //var link = jNode.find("a.content-title[href*='id=']").attr("href");
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
        commitUrl(seed,next);
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




