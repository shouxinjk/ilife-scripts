// ==UserScript==
// @name         亚马逊
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.amazon.cn/dp/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.amazon.cn/dp/B01G3R0PXU/ref=sr_1_9?s=amazon-global-store&ie=UTF8&qid=1540804468&sr=1-9
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
    url:web(window.location.href),
    type:"all",
    category:[],
    source:"amazon",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"亚马逊"
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
    source:"amazon",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
//var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements ("#productTitle", title);
    waitForKeyElements ("#productDescription p", summary);
    waitForKeyElements ("#feature-bullets li span", summary);
    waitForKeyElements ("#bylineInfo", tags_brand);//品牌作为标签
    waitForKeyElements ("#agsBadge", tags_badge);//海外购作为标签
    waitForKeyElements ("#wayfinding-breadcrumbs_feature_div .a-list-item", tags);//导航作为标签
    waitForKeyElements (".detail_badge", seller);
    waitForKeyElements (".imageThumbnail img", images_slide);
    //waitForKeyElements ("#productDescription img", images);
    waitForKeyElements ("#priceblock_ourprice",price_sale);
    //waitForKeyElements ("#ourprice_fbabadge:parent",price_bid);
    waitForKeyElements ("#acrPopover",rank_score);
    waitForKeyElements ("#acrCustomerReviewText",rank_count);//评价数
    waitForKeyElements (".pdTab tr",props);
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    if($("#acrPopover .a-declarative .a-popover-trigger") && $("#acrPopover .a-declarative .a-popover-trigger").length>0){//确认采集图片并执行点击事件
        var eClick = jQuery.Event( "click" );
        $("#acrPopover .a-declarative .a-popover-trigger").trigger( eClick );
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
    var txt = jNode.text().trim();
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().replace(/\s+/g,"");
    if(tag.length>1 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
        data.category.push(tag);//同时作为类别
    }
    commit("tags");
}

function tags_brand(jNode){
    var tag = jNode.text().replace(/\s+/g,"");
    if(tag.length>1 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_badge(jNode){
    var tag = jNode.attr("alt").replace(/\s+/g,"");
    if(tag.length>1 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().trim();
    commit("seller");
    //tags(jNode);//作为tag
}

function category(jNode){
    data.category.push("food");
    commit("category");
}

function props(jNode){
    if(jNode.find("td[width='30%']") && jNode.find("td[width='70%']")){
        var key = jNode.find("td.label").text().trim();
        var value = jNode.find("td.value").text().replace(/\n*\s+/g,"");
        var prop = {
            key:key,
            value:value
        };
        if(key.length>0){
            data.props.push(prop);
        }
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src").replace(/_US40_/g,"_UL1500_"));
    console.log("[slide img]",img);
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
    var score = jNode.text().match(/\d+\.*\d*/g);//4.8 可能包含小数点，可能不包含
    data.rank.score = score[0];
    data.rank.base = "5";
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);
    data.rank.count = count[0];
    commit("rank_count");
}

function price_sale(jNode){
    var price = jNode.text().match(/\d+\,*\d*\.*\d*/g);//1,779.48 可能包含小数点或逗号，也可能不包含
    data.price.sale = price[0];
    commit("price_sale");
}

function price_bid(jNode){
    var price = jNode.text().match(/\d+\,*\d*\.*\d*/g);//1,779.48 可能包含小数点或逗号，也可能不包含
    data.price.bid = price[0];
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//原始地址：https://www.amazon.cn/dp/B01G3R0PXU/ref=sr_1_9?s=amazon-global-store&ie=UTF8&qid=1540804468&sr=1-9
//判定地址：https://www.amazon.cn/dp/B01G3R0PXU
function web(link){
    var id = link.match(/\/dp\/[^\/]+/)[0];//匹配后返回：/dp/B01G3R0PXU
    return "https://www.amazon.cn"+id;
}

//转换为移动链接地址
//自适应PC与移动端，两者地址相同
//原始地址：https://www.amazon.cn/dp/B01G3R0PXU/ref=sr_1_9?s=amazon-global-store&ie=UTF8&qid=1540804468&sr=1-9
//判定地址：https://www.amazon.cn/dp/B01G3R0PXU
function wap(link){
    var id = link.match(/\/dp\/[^\/]+/)[0];//匹配后返回：/dp/B01G3R0PXU
    return "https://www.amazon.cn"+id;
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



