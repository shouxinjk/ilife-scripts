// ==UserScript==
// @name         国美-海外购
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract gome items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://higoitem.gome.com.cn/*
// @match        http://higoitem.gome.com.cn/*
// @grant        none
// ==/UserScript==

//示例URL
//https://higoitem.gome.com.cn/A0006141834-pop8009646437.html?intcmp=sy-1000061689-1

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
    source:"gome",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"国美超市"
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
    source:"gome",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var keys=[];//保存prop-key用于排重

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 50;

(function() {
    'use strict';
    waitForKeyElements ("#gm-prd-main h1", title);
    waitForKeyElements ("#prdtitcx", summary_subtitle);//子标题作为摘要
    //waitForKeyElements ("#description p:parent", summary);
    waitForKeyElements (".breadcrumbs-container li a", category);//类别
    waitForKeyElements (".hwggomeZiYing", seller_tag);//自营标签
    waitForKeyElements (".storeName", seller);
    waitForKeyElements (".specbox li",props);
    waitForKeyElements (".pic-small img", images_slide);
    waitForKeyElements ("#detailHtml img", images);//由于懒加载，避免获取占位图片
    waitForKeyElements ("#prdPrice:parent",price_sale);
    //waitForKeyElements (".small-price",price_bid);

    //waitForKeyElements (".pingjia_header",scroll);//滚动页面到底部，并点击“累计评价”
    waitForKeyElements (".spots a", tags);//用户评价
    waitForKeyElements ("#haocnt:parent",rank_score);
    waitForKeyElements ("#pincnt:parent",rank_count);//评价数
    //commitUrl(seed);//here is an example
})();

function scroll(jNode){
    //var eClick = jQuery.Event( "click" );
    //jNode.trigger( eClick );
    //*
    //滚动到页面底部：不 work
    console.log("scrolling page ... ",jNode.offset().top - $(window).height());
    $('body').animate({
        scrollTop: jNode.offset().top - $(window).height()
    }, 1000);
    //**/
}

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(jNode){
    if($("#detailHtml img") && $("#detailHtml img").length>0){//确认采集图片并执行点击事件
        $("#detailHtml img").each(function(){
            checkImage($(this).attr("gome-src"));//采集图片
        });
        if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
        $(".c00").css({"background-color":"yellow","border":"1px solid red"});
        var eClick = jQuery.Event( "click" );
        $(".c00").trigger( eClick );
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
    data.summary = prdInfo.description;
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g," ");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function summary_subtitle(jNode){
    var txt = jNode.text().replace(/\s+/g," ");
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().trim();//原始：内容丰富(6),替换后返回：内容丰富
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller_tag(jNode){
    data.tags.push(jNode.text().trim());
    commit("seller_tag");
}

function seller(jNode){
    data.seller.name = jNode.text().replace(/\./g,"").trim();
    commit("seller");
}

function category(jNode){
    var txt = jNode.text().trim();
    if(txt.length>0 && txt.length<6 &&"首页".indexOf(txt)<0){
        data.category.push(txt);
        commit("category");
    }
}

function props(jNode){
    if(jNode.find(".specinfo") && jNode.find("span:last")){
        var key = jNode.find(".specinfo").text().trim();
        var value = jNode.find("span:last").text().trim();
        var prop = {
            key:key,
            value:value
        };
        if(key.trim().length>0 && keys.indexOf(key)<0){
            data.props.push(prop);
            keys.push(key);
        }
        //将品牌作为tag
        if(key.trim().length>0 && ",品牌".indexOf(key)>=0 ){
            if(data.tags.indexOf(value)<0){
                data.tags.push(value);
            }
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("gome-src"));
    if(data.images.indexOf(img)<0){
        checkImage(img);
    }
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("rpic"));
    if(data.images.indexOf(img)<0){
        checkImage(img);
    }
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
    data.rank.score = jNode.text().match(/\d+/g)?Number(jNode.text().match(/\d+/g)[0])/20:0
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().match(/\d+/g)?Number(jNode.text().match(/\d+/g)[0]):0
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
//https://higoitem.gome.com.cn/9140044903-1130049776.html?intcmp=prom107182-MI218700-4
function web(link){
    return window.location.protocol+"//higoitem.gome.com.cn"+window.location.pathname;
}

//转换为移动链接地址
//web: https://higoitem.gome.com.cn/9140044903-1130049776.html?intcmp=prom107182-MI218700-4
//wap: http://item.m.gome.com.cn/product-A0006141834-pop8009646437.html
function wap(link){
    return window.location.protocol+"//item.m.gome.com.cn/product-"+window.location.pathname.substring(1);
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



