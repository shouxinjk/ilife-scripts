// ==UserScript==
// @name         驴妈妈-秒杀
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract tuangou deals
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.lvmama.com/tuangou/sale-*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.lvmama.com/tuangou/sale-638691

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
    url:window.location.href,
    type:"travel",
    source:"lvmama",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    destination:null,
    days:null,
    nights:null,
    trip:[],//每一段行程结构参见trip
    images:[],
    tags:["秒杀"],
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
    }
};

var trip={
    vehicle:{
        type:"",//flight/train/bus
        level:1 //level 1-3
    },
    hotel:3,//stars 1-5
    meal:3,//level 1-5
    amusement:0,//yes or no
    shopping:0//yes or no
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"lvmama",
    type:"travel",
    taskUrl:document.location.href,
    url:document.location.href
};

(function() {
    'use strict';
    waitForKeyElements (".nchtitle a", title);
    waitForKeyElements ("#product-detail div", summary);//摘要：风格1
    //waitForKeyElements (".detail-instance-body span div div", summary);//摘要：风格2
    waitForKeyElements (".crumbs-link a", tags);//将导航作为tag
    waitForKeyElements (".product-pic li img", images);//幻灯图片
    waitForKeyElements ("#product-detail div img", images);//正文图片：风格1
    //waitForKeyElements (".detail-instance-body div img", images);//正文图片：风格2
    waitForKeyElements (".percentum",rank_score);
    waitForKeyElements ("#totalCmt",rank_count);
    waitForKeyElements (".nchline-price-style",price_sale);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function schedule(jNode){
    var dayNights = jNode.parent().find("dd").text().trim().match(/\d+/g);
    data.days = dayNights[0];
    data.nights = dayNights[1];
    commit("days+nights");

    data.destination = jNode.parent().prev().find("dd").text().trim();
    commit("destination");
}

function summary(jNode){
    if(jNode.text().trim().length>10){//10个字符以上才采集
        data.summary = data.summary+jNode.text().trim()+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && tag.length<5 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
        commit("tags");
    }
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
    data.rank.score = Number(jNode.text().trim())/20;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = Number(jNode.text().match(/\d+/)[0]);
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = Number(price[0]);
    //data.price.bid = jNode.text().replace(/\s/g,"");
    commit("price_sale");
}

function price_bid(jNode){
    //data.price.bid = jNode.text().replace(/\s/g,"");
    commit("price_bid");
}

//http://www.lvmama.com/tuangou/sale-638691
function web(link){
    var ids = link.match(/\d+/g);
    return "http://www.lvmama.com/tuangou/deal-"+ids[0];
}


//web: http://www.lvmama.com/tuangou/sale-638691
//wap: https://m.lvmama.com/tuan/seckill/product-638691
function wap(link){
    var ids = link.match(/\d+/g);
    return "https://m.lvmama.com/tuan/seckill/product-"+ids[0];
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
    if(!debug)_next();
}




