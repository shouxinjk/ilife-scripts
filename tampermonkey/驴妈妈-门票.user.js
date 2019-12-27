// ==UserScript==
// @name         驴妈妈-门票
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract tickets
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://ticket.lvmama.com/scenic-*
// @grant        none
// ==/UserScript==

//示例URL
//http://ticket.lvmama.com/scenic-102843

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

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
    type:"ticket",
    source:"lvmama",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    location:"",
    address:"",
    stars:null,
    images:[],
    tags:[],
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
        web:window.location.href,//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    }
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"lvmama",
    type:"ticket",
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
    waitForKeyElements ("h1.tit", title);
    waitForKeyElements (".crumbs-list .crumbs-down-a", location);
    waitForKeyElements (".dl-hor dt:contains('景点地址')", address);
    waitForKeyElements (".mp_star i", stars);
    waitForKeyElements ("#introduction .dcontent p", summary);
    waitForKeyElements (".c_09c span", tags);
    waitForKeyElements (".pic_mod_ul li img", images);
    waitForKeyElements (".comcount",rank_score);
    waitForKeyElements (".com-count em a",rank_count);
    waitForKeyElements ("#firstuppGoodsPrice",sale_price);
    waitForKeyElements ("#firstSuppGoodsMarkerPrice",bid_price);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.attr("title");
    commit("title");
}

function location(jNode){
    data.location = data.location.trim()+" "+jNode.text().trim().replace(/景点门票/g,"");
    commit("location");
}

function address(jNode){
    data.address = jNode.parent().find("dd p").text().trim();
    commit("address");
}

function stars(jNode){
    data.stars = jNode.text().trim();
    data.tags.push(jNode.parent().text().replace(/\s/g,""));
    commit("stars");
}

function summary(jNode){
    if(data.summary.length < 500){
        data.summary = data.summary+jNode.text().replace(/\s+/g,"")+"<br/>";
    }
    commit("summary");
}

function tags(jNode){
    data.tags.push(jNode.text().replace(/\s+/g,"")+"好评");
    commit("tags");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    if(data.images.indexOf(img)<0){
        data.images.push(img);
    }
    commit("images");
}

function rank_score(jNode){
    var score = jNode.text().match(/\d*\.*\d/g);//(4.2)
    data.rank.score = score[0];
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().trim();
    commit("rank_count");
}

function sale_price(jNode){
    data.price.sale = jNode.attr("value");
    commit("sale_price");
}

function bid_price(jNode){
    data.price.bid = jNode.attr("value");
    commit("bid_price");
}

//获取移动端网页地址
function wap(link){
    //<meta name="mobile-agent" content="format=html5; url=http://m.lvmama.com/ticket/piao-183253">
    var meta = $("meta[name='mobile-agent']").attr("content");
    var test = "url=";
    var index = meta.indexOf(test);
    return meta.substring(index+test.length).replace("http","https");
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
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}




