// ==UserScript==
// @name         淘宝
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://item.taobao.com/item.htm?*
// @grant        none
// ==/UserScript==

//示例URL
//https://item.taobao.com/item.htm?spm=a219t.7900221/10.1998910419.d30ccd691.742975a5ERSair&id=568150899908

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("taobao");

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
    url:web(window.location.href),
    type:"all",
    category:[],
    source:"taobao",
    title:null,
    summary:"",
    price:{
        bid:null,
        coupon:null,
        sale:null
    },
    profit:{
        type:"2-party",
        rate:null,
        amount:null,
    },
    slides:[],
    images:[],
    tags:[],
    distributor:{
        name:"淘宝"
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
        web:web(window.location.href),//web浏览地址
        wap:wap(window.location.href)//移动端浏览地址，默认与web一致
    },
    props:[]//key,value键值对
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"taobao",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var timerId = setInterval(clickCommentsTab,next, 500);
var timerMaxCount = 20;

var startTime = new Date().getTime();//用时间戳控制页面切换时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

(function() {
    'use strict';
    //更新当前url状态为done
    commitUrl({
        url:document.location.href,
        status:"done"
    },printMsg);
    checkProfit();
    waitForKeyElements (".tb-main-title", title);
    waitForKeyElements (".tb-subtitle", summary_subtitle);//子标题作为摘要
    //waitForKeyElements ("#description p:parent", summary);
    waitForKeyElements (".tb-stuff-status", tags);//店铺热搜 也作为标签
    waitForKeyElements (".tb-shop-name", seller);
    waitForKeyElements (".attributes-list li",props);
    waitForKeyElements ("#J_UlThumb img", images_slide);
    waitForKeyElements ("#description img[src*=imgextra]", images);//由于懒加载，避免获取占位图片
    waitForKeyElements ("#J_StrPrice .tb-rmb-num",price_bid);//默认需要设置price sale
    waitForKeyElements ("#J_PromoPriceNum",price_sale);//注意：如果没有该值则直接使用price bid

    //waitForKeyElements (".J_ReviewsCount:parent",click);//点击“累计评价”
    waitForKeyElements (".kg-rate-wd-impression li:parent", tags);//评价
    waitForKeyElements (".rate-score strong:parent",rank_score);
    waitForKeyElements (".J_ReviewsCount[data-spm-anchor-id]:parent",rank_count);//评价数
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    if($("#description p img[src*=imgextra]") && $("#description p img[src*=imgextra]").length>0){//确认采集图片并执行点击事件
        $("#description p img[src*=imgextra]").each(function(){
            checkImage($(this));//采集图片
        });
        if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
        var eClick = jQuery.Event( "click" );
        $(".J_ReviewsCount:parent").trigger( eClick );
        clearInterval(timerId);//清除定时器
        timerId = setInterval(next, 500);//需要设置页面跳转检查
    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
            timerId = setInterval(next, 500);//需要设置页面跳转检查
        }
    }
}

function checkProfit(){
    //获取链接中的预准备参数，包括佣金比例、佣金额等
    var params = _getQuery();
    if(params&&params["rate_percentage"]&&params["rate_percentage"].trim().length>0){//佣金率
        data.profit.rate = Number(params["rate_percentage"]);//注意默认为百分比
    }
    if(params&&params["rate_amount"]&&params["rate_amount"].trim().length>0){//佣金
        data.profit.amount = Number(params["rate_amount"]);//
    }
    if(params&&params["rate_coupon"]&&params["rate_coupon"].trim().length>0){//优惠券
        data.price.coupon = Number(params["rate_coupon"]);//
    }
}

function title(jNode){
    data.title = jNode.attr("data-title").trim();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g,"");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function summary_subtitle(jNode){
    var txt = jNode.text().replace(/\s+/g,"");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().replace(/\(\d+\)/g,"").trim();//原始：内容丰富(6),替换后返回：内容丰富
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().trim();
    commit("seller");
}

function category(jNode){
    data.category.push("all");
    commit("category");
}

function props(jNode){
    var txt = jNode.text().replace(/：/g,":").replace(/\n/g,"").replace(/\s/g,"").split(":");//是否含糖: 含糖
    var prop = {
        //key:txt[0],
        //value:txt[1]
    };
    prop[txt[0]]=txt[1];
    data.props.push(prop);
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("data-src")).replace(/50x50/,"400x400");
    checkImage(img);
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

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);//4.8 可能包含小数点，可能不包含
    data.rank.score = Number(score[0]);
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = Number(jNode.text().trim());
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = price&&price[0]?Number(price[0]):data.price.bid;
    commit("price_sale");
}

function price_bid(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g);
    data.price.bid = price&&price[0]?Number(price[0]):null;//58.0
    data.price.sale = data.price.bid;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://item.taobao.com/item.htm?id=568150899908
function web(link){
    var id = link.match(/id=\d+/)[0];//匹配后返回：id=570595315246
    return "https://item.taobao.com/item.htm?"+id;
}

//转换为移动链接地址
//web: https://item.taobao.com/item.htm?id=568150899908
//wap: https://h5.m.taobao.com/awp/core/detail.htm?id=570595315246
function wap(link){
    var id = link.match(/id=\d+/)[0];//匹配后返回：id=570595315246
    return "https://h5.m.taobao.com/awp/core/detail.htm?"+id;
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

function printMsg(msg){
    console.log(msg);
}

