// ==UserScript==
// @name         TravelZoo-自营
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.travelzoo.com/cn/local-deals/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.travelzoo.com/cn/local-deals/EastCN/Getaway/311302/?dlocId=1073
//https://www.travelzoo.com/cn/local-deals/Shanghai/Spa/323118/?dlocId=1523
if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

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
    type:"travel",
    category:[],
    source:"travelZoo",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"旅游族"
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
        executor:"machine",//机器标识
        url:window.location.href//原始浏览地址
    },
    source:"travelZoo",
    type:"travel",
    url:document.location.href
};

var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    extract();
    //waitForKeyElements (".crumbs span a:contains('自由行预订')", extract);//采集自由行线路
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract travel ...");}
    params();//从链接中提取标签
    waitForKeyElements ("#deal-headline", title);
    waitForKeyElements (".deal-details-list li", summary);
    waitForKeyElements (".why-we-love-this-list li b p", tags);
    waitForKeyElements ("script[type='application/ld+json']", tags_meta);
    //waitForKeyElements (".crumb a", tags_crumb);
    waitForKeyElements (".js-gallery-image img", images_slide);
    //waitForKeyElements (".detail-feature-photos img", images);
    waitForKeyElements (".percentage-gauge",rank_score);
    waitForKeyElements (".review-count",rank_count);
    waitForKeyElements (".deal-price",price);//两个价格在一起，第一个是售价，第二个是原价
    waitForKeyElements ("#deal-company",seller);//卖家
    //waitForKeyElements (".J_tagItem", tags_comment);
    //sroll_page();
}

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

//等待详情图片加载完成并点击“全部评论”tab
function clickCommentsTab(){
    var ele = ".detail-feature-photos img";
    var tab = ".detail-tab-item[data-rel='#J_Comment']";
    if($(ele) && $(ele).length>0){
        $(ele).each(function(){
            checkImage(fullUrl($(this).attr("data-ks-lazyload")));//采集图片
        });
        if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
        //注册滚动事件
        $(tab).click(function (){
            $('html, body').animate({
                scrollTop: $(tab).offset().top
            }, 2000);
        });

        var eClick = jQuery.Event( "click" );
        $(tab).trigger( eClick );
        clearInterval(timerId);//清除定时器
    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
        }
    }
}

//从地址中获取标签
//参数形式为： tags=xxx,yyy,zzz
function params(){
    var q = _getQuery();
    if(q.tags && q.tags.length>0){//tags=xxx,sss,ddd
        var tags = q.tags.split(",");
        for(var i=0;i<tags.length;i++){
            var tag = tags[i];
            if(tag.length>0 && data.tags.indexOf(tag)<0){
                data.tags.push(tag);
            }
        }
        commit("url_tags");
    }
}

function title(jNode){
    data.title = jNode.text().replace(/\s+/g," ").trim();
    commit("title");
}

function summary(jNode){
    data.summary += jNode.text().replace(/\s+/g," ")+"<br/>";
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text().trim();
    if(data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_meta(jNode){
    var json = JSON.parse(jNode.text().trim());
    if(json.keywords){
        for(var i in json.keywords){
            data.tags.push(json.keywords[i]);
        }
    }
    commit("tags_meta");
}

function tags_crumb(jNode){
    var tag = jNode.text().trim();
    if(tag.length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_crumb");
}

function tags_comment(jNode){
    var tag = jNode.text().replace(/\(\d+\)/g,"").trim();
    if(tag.length>3 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_comment");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

//判定尺寸后提交，需要大于300*100
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        //if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=300 && img.height>=100 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            //if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=300 && img.height>=100 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);
    data.rank.score = score&&score[0]?Number(score[0])/20:null;
    data.rank.base = 5.0;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);
    data.rank.count = count&&count[0]?Number(count[0]):null;
    commit("rank_count");
}

function price(jNode){
    var price = jNode.text().replace(/,/g,"").match(/\d+\.*\d*/g);
    data.price.sale = price&&price[0]?Number(price[0]):null;
    data.price.bid = price&&price[1]?Number(price[1]):null;
    commit("price");
}

function location_from(jNode){
    var city = jNode.text().trim().replace(/出发地：/,"");//出发地：成都
    if(data.location.from.indexOf(city)<0){
        data.location.from.push(city);
        commit("location_from");
    }
}

function seller(jNode){
    data.seller.name = jNode.text().trim().replace(/\s+/,"");//商店：飞猪自营
    commit("seller");
}

//转换为web链接地址：需要去除附加信息，确保唯一性
//https://www.travelzoo.com/cn/local-deals/EastCN/Getaway/311302/?dlocId=1073
//https://www.travelzoo.com/cn/local-deals/EastCN/Getaway/311302/
function web(link){
    var ids = link.indexOf("/?");
    return link.substring(0,ids);
}

//转换为移动链接地址
//https://www.travelzoo.com/cn/local-deals/EastCN/Getaway/311302/?dlocId=1073
//https://www.travelzoo.com/cn/local-deals/EastCN/Getaway/311302/
function wap(link){
    var ids = link.indexOf("/?");
    return link.substring(0,ids);
}

//获取不同的类型
function type(link){
    var types = link.match(/package|drive|tour/g);
    return types[0];
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
    return data.title && data.images.length>0 && data.price.sale && data.tags.length>0;
}

//navigate to next url
function next(){
    if(!debug){_next()};
}



