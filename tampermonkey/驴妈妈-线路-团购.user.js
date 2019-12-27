// ==UserScript==
// @name         驴妈妈-线路-团购
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract free tour lines
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://dujia.lvmama.com/group/*
// @grant        none
// ==/UserScript==

//示例URL
//http://dujia.lvmama.com/group/448610?losc=135315&ict=i

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;

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
    type:"group",
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
    tags:["团购"],
    distributor:{
        name:"驴妈妈"
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
    type:"group",
    taskUrl:document.location.href,
    url:document.location.href
};

(function() {
    'use strict';
    waitForKeyElements ("h1.detail_product_tit", title);
    waitForKeyElements (".product_info dt:contains('游玩天数')", schedule);
    waitForKeyElements (".product_xq div", summary);//摘要：风格1
    waitForKeyElements (".detail-instance-body span div div", summary,true);//摘要：风格2
    waitForKeyElements (".product_info dd", tags);//将行程天数、目的地、费用包含作为tag
    waitForKeyElements (".dpn_group", tags);//行程类型作为tag
    waitForKeyElements (".detail_product_num:contains('本产品委托社为')",seller);
    waitForKeyElements (".img_scroll_list li img", images);//幻灯图片
    waitForKeyElements (".product_xq div img", images);//正文图片：风格1
    waitForKeyElements (".detail-instance-body div img", images);//正文图片：风格2
    waitForKeyElements (".comcount",rank_score);
    waitForKeyElements (".com-count em a",rank_count);
    waitForKeyElements (".price_num dfn",price);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.text().replace(/\s+/g," ").trim();
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
    var lists = jNode.text().trim().split(/、/g);
    for(var i=0;i<lists.length;i++){
        var tag = lists[i].trim();
        if(tag.length>0 && tag.length<6 && data.tags.indexOf(tag)<0){
            data.tags.push(tag);
        }
    }
    commit("tags");
}

function seller(jNode){
    var txt = jNode.text().match(/本产品委托社为[^，]+，/g);
    var seller = txt[0].replace(/本产品委托社为/g,"").replace(/，/g,"").trim();
    data.seller.name = seller;
    commit("seller");
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
    var score = jNode.text().match(/\d*\.*\d/g);//(4.2)
    data.rank.score = score[0];
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().trim();
    commit("rank_count");
}

function price(jNode){
    //data.price.bid = jNode.text().replace(/\s/g,"");
    data.price.sale = jNode.text().replace(/\s/g,"");
    commit("price");
}

//转换为标准地址，去除spm等信息
//web: http://dujia.lvmama.com/group/448610?losc=135315&ict=i
function web(link){
    var id = link.match(/\d+/g);//匹配后返回：448610
    return "http://dujia.lvmama.com/group/RPODUCTID".replace(/RPODUCTID/,id[0]);
}

//wap: https://m.lvmama.com/product/448610/?lvfrom=VST&criticalPriceDifference=50000
function wap(link){
    var id = link.match(/\d+/g);//匹配后返回：448610
    return "https://m.lvmama.com/product/RPODUCTID".replace(/RPODUCTID/,id[0]);
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
    if(!debug){
        _next();
    }
}




