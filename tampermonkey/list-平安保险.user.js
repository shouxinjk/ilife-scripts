// ==UserScript==
// @name         list-平安保险
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract item
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://baoxian.pingan.com/product/*
// @grant        none
// ==/UserScript==

//示例URL
//http://baoxian.pingan.com/product/yiwaibaoxian.shtml

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;

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
            executor:"machine"//机器标识
        },
        source:"pingan",
        type:"item",
        taskUrl:document.location.href,
        status:"new",
        url:null // by default the url is null
    }
);

(function() {
    'use strict';
    waitForKeyElements (".list_product li>a", item);//采集具体商品页面
    waitForKeyElements (".side_list_cont a", list);//采集列表页面，一般是分页
})();

function item(jNode){//采集具体内容条目
    //注意：由于有多个seed，需要重新赋值
    seed=JSON.parse(seedTpl);
    tags = [];
    var tag = jNode.text().trim();
    if(tag.length>0){
        tags.push(tag);
    }
    //获取链接地址
    var link = jNode.attr("href");
    //将tag放入链接地址
    if(link.indexOf("?")>0 && tags.length>0){
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
    seed.url = fullUrl(jNode.attr("href"));
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




