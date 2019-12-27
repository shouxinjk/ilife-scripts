// ==UserScript==
// @name         苏宁易购
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://product.suning.com/*
// @grant        none
// ==/UserScript==

//示例URL
//https://product.suning.com/0070206066/10571769801.html?adtype=1

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
    url:web(window.location.href),
    type:"all",
    category:[],
    source:"suning",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"苏宁易购"
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
    source:"suning",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var keys=[];//保存prop-key用于排重

var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements ("#itemDisplayName", title);
    //waitForKeyElements (".newp", summary_subtitle);//子标题作为摘要
    //waitForKeyElements ("#description p:parent", summary);
    waitForKeyElements (".dropdown-text .ft", category);//类别，同时也作为标签
    waitForKeyElements ("#itemNameZy", seller);//平台自营
    waitForKeyElements ("#shopName a", seller);
    waitForKeyElements ("#itemParameter tr",props);
    waitForKeyElements (".imgzoom-thumb-main img", images_slide);
    waitForKeyElements ("#productDetail img", images);//由于懒加载，避免获取占位图片
    waitForKeyElements (".mainprice",price_sale);
    waitForKeyElements (".small-price",price_bid);

    //waitForKeyElements (".J_ReviewsCount:parent",click);//点击“累计评价”
    waitForKeyElements (".item .label span", tags);//用户评价
    waitForKeyElements ("#gSatisfy",rank_score);
    waitForKeyElements ("#productCommTitle",rank_count);//评价数
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    if($("#productDetail img") && $("#productDetail img").length>0){//确认采集图片并执行点击事件
        $("#productDetail img").each(function(){
            checkImage($(this).attr("src"));//采集图片
        });
        if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
        var eClick = jQuery.Event( "click" );
        $("#productCommTitle").trigger( eClick );
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
    data.seller.name = jNode.text().trim();
    if("自营"==jNode.text().trim()){
        data.tags.push("平台自营");
    }
    commit("seller");
}

function category(jNode){
    data.category.push(jNode.text().trim());
    tags(jNode);
    commit("category");
}

function props(jNode){
    if(jNode.find(".name") && jNode.find(".val")){
        var key = jNode.find(".name").text().trim();
        var value = jNode.find(".val").text().trim();
        var prop = {
            key:key,
            value:value
        };
        if(key.trim().length>0 && keys.indexOf(key)<0){
            data.props.push(prop);
            keys.push(key);
        }
        //将品牌、口味作为tag
        if(key.trim().length>0 && ",品牌,口味".indexOf(key)>=0 ){
            if(data.tags.indexOf(value)<0){
                data.tags.push(value);
            }
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src-large"));
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
    data.rank.score = Number(jNode.text().trim());
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().match(/\d+/g)[0];
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = Number(jNode.text().replace(/¥/g,""));//36.5
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().replace(/¥/g,""));//58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://product.suning.com/0070206066/10571769801.html?adtype=1
function web(link){
    var id = link.match(/\d+/g);//匹配后返回：0070206066，10571769801
    return "https://product.suning.com/"+id[0]+"/"+id[1]+".html";
}

//转换为移动链接地址
//web: https://product.suning.com/0070206066/10571769801.html?adtype=1
//wap: https://m.suning.com/product/0070206066/10571769801.html?adtype=1
function wap(link){
    var id = link.match(/\d+/g);//匹配后返回：0070206066，10571769801
    return "https://m.suning.com/product/"+id[0]+"/"+id[1]+".html";
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



