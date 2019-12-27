// ==UserScript==
// @name         list-建行积分商城
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract list
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://jf.ccb.com/exchangecenter/search/*
// @grant        none
// ==/UserScript==

//示例URL
//http://jf.ccb.com/exchangecenter/search/product.jhtml?keyword=%E8%BF%90%E5%8A%A8%E4%BC%91%E9%97%B2&scoreRegion=0%EF%BD%9E99999999&exchangeChannel=net&payType=1

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

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
            executor:"machine"//机器标识
        },
        source:"ccb",
        type:"item",
        taskUrl:document.location.href,
        status:"new",
        url:null // by default the url is null
    }
);

(function() {
    'use strict';
    waitForKeyElements (".product_bk a", item);//采集具体商品页面
    //waitForKeyElements (".pager_container a", list);//采集列表页面，一般是分页
})();

function item(jNode){//采集具体内容条目
    //注意：由于有多个seed，需要重新赋值
    seed=JSON.parse(seedTpl);
    tags = [];
    //获取链接地址
    var link = jNode.attr("href");
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




