// ==UserScript==
// @name         平安保险
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://baoxian.pingan.com/product/*
// @grant        none
// ==/UserScript==

//示例URL
//http://baoxian.pingan.com/product/quanchewuyou.shtml
//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;

var schema={
//TODO: validate and commit
};

var prop_keys = [];//临时，用于记录prop的key，避免重复

var data={
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    url:web(window.location.href),
    type:"insurance",
    category:[],
    source:"pingan",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:["积分兑换"],
    distributor:{//平台，如当当，淘宝，携程
        name:"平安保险商城"
    },
    producer:{//厂商，指商品或服务提供者。服务提供商，书籍出版商，旅行社
        name:""
    },
    seller:{//卖家，即商店，京东自营，当当自营，***旗舰店
        name:"平安保险商城"
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
    source:"pingan",
    type:"insurance",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements ("title", title);
    //waitForKeyElements (".location a", category);
    waitForKeyElements (".rollist_a_bg2", images_slide);
    waitForKeyElements (".pro_det_con img", images);
    waitForKeyElements (".pro_det_con_tips p span", summary);
    //waitForKeyElements ("a[href*=storeId]", seller);
    //waitForKeyElements (".p-parameter-list li",props);
    waitForKeyElements (".pro-price-item",price_sale);
    //waitForKeyElements (".J-mPrice",price_bid);
    //waitForKeyElements (".card-type span", tags);
    //waitForKeyElements (".product-score-sc",rank_score);
    //waitForKeyElements (".J-detail-commentCnt-count",rank_count);//评价数
    //sroll_page();
    //commitUrl(seed);//here is an example
})();

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

//等待详情图片加载完成并点击“全部评论”tab
function clickCommentsTab(){
    if($("#J-detail-content img") && $("#J-detail-content img").length>0){
        $("#J-detail-content img").each(function(){
            checkImage(fullUrl($(this).attr("src")));//采集图片
        });
        if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
        //注册滚动事件
        $(".tab-main ul li[data-anchor='#comment']").click(function (){
            $('html, body').animate({
                scrollTop: $(".tab-main ul li[data-anchor='#comment']").offset().top
            }, 2000);
        });

        var eClick = jQuery.Event( "click" );
        $(".tab-main ul li[data-anchor='#comment'] s:parent").trigger( eClick );
        clearInterval(timerId);//清除定时器
    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
        }
    }
}

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g,"").replace(/<br>/g,"<br/>");
    if(txt.length>0){
        data.summary += txt;
        commit("summary");
    }
    //解析属性列表
    //props(jNode);
}

function summary_subtitle(jNode){
    var txt = jNode.text().replace(/\s+/g,"");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function good_shop(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("good_shop");
}

function tags(jNode){
    var txt = jNode.text().replace(/\s+/g,";");
    var tag = txt.split("、");
    for(var i=0;i<tag.length;i++){
        var t = tag[i];
        if(t.length>1 && data.tags.indexOf(t)<0){
            data.tags.push(t);
        }
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().trim();
    commit("seller");
}

function category(jNode){
    var cat = jNode.text().trim();
    if(data.category.indexOf(cat)<0 && ",首页".indexOf(cat)<0 && cat.length<6){
        data.category.push(cat);
        commit("category");
        data.tags.push(cat);//同时作为标签
    }
}

function props(jNode){
    var txt = jNode.text().replace(/\s+/g,"").split("：");
    if(txt.length>1 && txt[1].trim().length>0){
        var key = txt[0].trim();
        var value = txt[1].replace(/；/g,"").trim();
        if(key.length>0&&prop_keys.indexOf(key)<0){
            prop_keys.push(key);
            data.props.push({key:key,value:value});
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var bgImg = jNode.css("backgroundImage").replace('url(','').replace(')','').replace(/"/g,'').trim();//取背景图片
    var img = fullUrl(bgImg);
    //console.log("bgimg\n\r",bgImg);
    checkImage(img);
}

//判定尺寸后提交，需要大于300*300
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
    var score = jNode.text().trim();
    data.rank.score = score;
    data.rank.base = "5";
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().trim();
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = num?Number(num[0]):null;
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().replace(/\s/g,""));//58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//http://baoxian.pingan.com/product/quanchewuyou.shtml
function web(link){
    var id = link.match(/[a-zA-Z0-9]+\.shtml/g);//匹配后返回：quanchewuyou.shtml
    return "http://baoxian.pingan.com/product/PRODUCTID".replace(/PRODUCTID/,id);
}

//转换为移动链接地址
//http://baoxian.pingan.com/product/quanchewuyou.shtml
function wap(link){
    var id = link.match(/[a-zA-Z0-9]+\.shtml/g);//匹配后返回：quanchewuyou.shtml
    return "http://baoxian.pingan.com/product/PRODUCTID".replace(/PRODUCTID/,id);
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
    if(!debug){_next();}
}



