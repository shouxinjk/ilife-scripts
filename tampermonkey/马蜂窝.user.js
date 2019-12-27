// ==UserScript==
// @name         马蜂窝
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://www.mafengwo.cn/sales/*
// @grant        none
// ==/UserScript==

//示例URL
//http://www.mafengwo.cn/sales/2754760.html
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
    type:"travel",
    category:[],
    source:"mafengwo",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"马蜂窝"
    },
    producer:{//厂商，指商品或服务提供者。服务提供商，书籍出版商，旅行社
        name:""
    },
    seller:{//卖家，即商店，京东自营，当当自营，***旗舰店
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
    source:"mafengwo",
    type:"travel",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements (".sales-title h1", title);
    waitForKeyElements (".crumb .item a[data-sk='type']", category);
    waitForKeyElements (".info-tips-box span", summary);
    waitForKeyElements (".m-contact a.title:parent", seller);
    waitForKeyElements (".p-parameter-list li",props);
    waitForKeyElements (".sales-photo li img", images_slide);
    waitForKeyElements (".notes-content img", images);
    waitForKeyElements (".item-price",price_sale);
    waitForKeyElements (".custom-panel .price",price_sale);//定制线路价格，二选一
    waitForKeyElements (".s-label span", tags);
    //waitForKeyElements (".comment-percent .percent-con",rank_score);
    //waitForKeyElements (".tab-main ul li[data-anchor='#comment'] s:parent",rank_count);//评价数
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
    var tag = jNode.text().replace(/\(\d+\)/g,"");//原始：内容丰富(6),替换后返回：内容丰富
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    console.log("seller\n\r",jNode.text());
    data.seller.name = jNode.text().trim();
    commit("seller");
}

function category(jNode){
    var cat = jNode.text().trim();
    if(data.category.indexOf(cat)<0){
        data.category.push(cat);
        commit("category");
    }
}

function props(jNode){
    var txt = jNode.text().trim().split("：");
    var prop = {
        key:txt[0],
        value:txt[1]
    };
    if(prop_keys.indexOf(txt[0])<0){
        prop_keys.push(txt[0]);
       data.props.push(prop);
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

//判定尺寸后提交，需要大于300*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=300 && img.height>=200 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=300 && img.height>=300 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+/g);//98% 需要折算为5分制
    var scoreInt = 0;
    try {
        scoreInt = parseInt(score[0])/20;
    }
    catch(err) {
        if(debug){console.log("cannot parse score.[org]"+score);}
    }
    data.rank.score = scoreInt;
    data.rank.base = "5";
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().trim().replace(/\(/g,"").replace(/\)/g,"");
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
//http://www.mafengwo.cn/sales/2754760.html
function web(link){
    var id = link.match(/\d+\.html/)[0];//匹配后返回：2754760.html
    return "http://www.mafengwo.cn/sales/PRODUCTID".replace("PRODUCTID",id);
}

//转换为移动链接地址
//https://m.mafengwo.cn/sales/2754760.html
function wap(link){
    var id = link.match(/\d+\.html/)[0];//匹配后返回：2754760.html
    return "https://m.mafengwo.cn/sales/PRODUCTID".replace("PRODUCTID",id);
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



