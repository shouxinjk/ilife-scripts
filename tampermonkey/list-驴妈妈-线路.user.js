// ==UserScript==
// @name         list-驴妈妈-线路
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract list
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://s.lvmama.com/*
// @grant        none
// ==/UserScript==

//示例URL
//http://s.lvmama.com/scenictour/K310000P4?keyword=%E7%8F%A0%E6%B5%B7&k=1#list

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("lvmama");

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
        source:"lvmama",
        type:"item",
        taskUrl:document.location.href,
        status:"new",
        url:null // by default the url is null
    }
);

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    waitForKeyElements (".product-item", item);//采集具体商品页面
    waitForKeyElements (".pagebox>a", list);//采集列表页面，一般是分页
})();

function item(jNode){//采集具体内容条目
    //注意：由于有多个seed，需要重新赋值
    seed=JSON.parse(seedTpl);
    tags = [];
    //导航作为tag
    jNode.find(".crumbs-link a").each(function( index ) {
        var txt = $( this ).text().trim();
        if(debug){console.log("curmbs link.",index,txt);}
        if(txt.length>0 && tags.indexOf(txt)<0 && ",首页,".indexOf(txt)<0){
            tags.push(txt);
        }
    });
    //产品类型作为tag
    jNode.find(".product-label").each(function( index ) {
        var txt = $( this ).text().trim();
        //if(debug){console.log("product label.",index,txt);}
        if(txt.length>0 && tags.indexOf(txt)<0){
            tags.push(txt);
        }
    });
    //产品提示作为标签
    jNode.find("em.hotTips").each(function( index ) {
        var txt = $( this ).text().trim();
        //if(debug){console.log("hotTips.",index,txt);}
        if(txt.length>0 && tags.indexOf(txt)<0){
            tags.push(txt);
        }
    });
    //获取链接地址
    var link = jNode.find("a.product-picture").attr("href");
    //将tag放入链接地址
    if(link.indexOf("?")>0){
        seed.url = link +"&tags="+tags.join();
    }else{
        seed.url = link +"?tags="+tags.join();
    }
    commit("seed item "+ index);
}

function list(jNode){//采集列表页
    seed=JSON.parse(seedTpl);
    seed.type="list";
    //获取分页地址
    var link = jNode.attr("onclick");
    //onclick='routeSelectAjax("s<lvmama<com>scenictour>K310000L20702?keyword=珠海&tabType=scenictour#list")'
    link = link.replace(/routeSelectAjax/g,"").replace(/\(/g,"").replace(/\)/g,"");
    link = link.replace(/</g,".").replace(/>/g,"/");
    link = link.replace(/"/g,"");
    seed.url = document.location.protocol+"//"+link;
    commit("seed item "+ index);
}

function url(link){
    return link;
}

//commit data
function commit(key){
    commitTime = new Date().getTime();
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
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}




