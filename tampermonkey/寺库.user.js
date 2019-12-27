// ==UserScript==
// @name         寺库
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://item.secoo.com/*
// @grant        none
// ==/UserScript==

//示例URL
//http://item.secoo.com/36396133.shtml?source=search

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

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
    url:web(window.location.href),
    type:"all",
    category:[],
    source:"secoo",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"寺库"
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
    source:"secoo",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements (".proName h2", title);
    waitForKeyElements (".b-con", summary);//品牌故事作为摘要
    waitForKeyElements (".smallNav p>a", tags);//分类作为标签
    waitForKeyElements (".slogo-shopname:parent", seller);
    waitForKeyElements ("#J_AttrUL li",props);
    waitForKeyElements (".move_box a>img", images_slide);
    waitForKeyElements (".moudle_details p>img", images);
    waitForKeyElements ("#secooPriceJs",price_sale);
    //waitForKeyElements ("#J_StrPriceModBox .tm-price",price_bid);
    waitForKeyElements (".zxx_con",props);
    waitForKeyElements ("#commentSumCore",rank_score);
    waitForKeyElements ("#allCommentCount",rank_count);//评价数
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
    var txt = jNode.text().replace(/\s+/g," ");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && tag.length<10 && data.tags.indexOf(tag)<0 && ",首页".indexOf(tag)<0){
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
    var txt = jNode.text().trim().split("：");//是否含糖: 含糖
    var prop = {
        key:txt[0].trim(),
        value:txt[1].trim()
    };
    data.props.push(prop);
    //部分作为标签
    var key = txt[0].trim();
    var value = txt[1].trim();
    if(data.tags.indexOf(value)<0 &&",产地，适用季节，品牌名称".indexOf(key)>0){
       data.tags.push(value);
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("data-original"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("bigsrc"));
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
    var score = jNode.text().match(/\d+\.*\d*/g);// 5.0/5.0可能包含小数点，可能不包含
    data.rank.score = score?Number(score[0]):null;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);// 全部（1）
    data.rank.count = count?Number(count[0]):null;
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = Number(jNode.text().trim().replace(/,/g,""));
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().trim().replace(/,/g,""));//58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//http://item.secoo.com/36396133.shtml?source=search
function web(link){
    var id = link.match(/\d+/)[0];//匹配后返回：id=570595315246
    return "http://item.secoo.com/ITEMID.shtml".replace(/ITEMID/g,id);
}

//转换为移动链接地址
//web: http://item.secoo.com/36396133.shtml?source=search
//wap: https://m.secoo.com/proDetail_1217.html?prodId=36396133
function wap(link){
    var id = link.match(/\d+/)[0];//匹配后返回：id=570595315246
    return "https://m.secoo.com/proDetail_1217.html?prodId="+id;
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



