// ==UserScript==
// @name         驴妈妈-线路-自由行
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract free tour lines
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://dujia.lvmama.com/freetour/*
// @grant        none
// ==/UserScript==

//示例URL
//http://dujia.lvmama.com/freetour/429656-D258?losc=222346&ict=i

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
    type:"freetour",
    source:"lvmama",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["自由行"],
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
    waitForKeyElements ("#currentProductName", title);
    //waitForKeyElements (".product_info dt:contains('游玩天数')", schedule);
    waitForKeyElements (".product_xq div", summary);//摘要：风格1
    waitForKeyElements (".detail-instance-body span div div", summary,true);//摘要：风格2
    waitForKeyElements (".product_info dd", tags);//将行程天数、目的地、费用包含作为tag
    waitForKeyElements (".img_scroll_list li img", images);//幻灯图片
    waitForKeyElements (".product_xq div img", images);//正文图片：风格1
    waitForKeyElements (".detail-instance-body div img", images);//正文图片：风格2
    waitForKeyElements (".comcount",rank_score);
    waitForKeyElements (".com-count em a",rank_count);
    waitForKeyElements (".price_num dfn",price);
    //commitUrl(seed);//here is an example
})();

function title(jNode){
    data.title = jNode.val().trim();
    commit("title");
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

//转换为移动链接地址，其中包含两个主要信息：productId和出发地Id
//web: http://dujia.lvmama.com/freetour/429656-D13
//wap: https://m.lvmama.com/product/429656/f13

//注意：web版页面包含有mobile-agent信息如：<meta name="mobile-agent" content="format=html5; url=http://m.lvmama.com/product/429656/">
//但该信息内未包括出发地信息，采用手动处理补全
function wap(link){
    var line = link.match(/\d+/g);//匹配后返回：429656，13，分别为productID、出发地ID
    var productId = line[0];
    var departure = line.length>1?"/f"+line[1]:"";
    return "https://m.lvmama.com/product/"+productId+departure;
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
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}




