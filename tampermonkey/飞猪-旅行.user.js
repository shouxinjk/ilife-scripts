// ==UserScript==
// @name         飞猪-旅行
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://traveldetail.fliggy.com/item.htm?*
// @grant        none
// ==/UserScript==

//示例URL
//https://traveldetail.fliggy.com/item.htm?id=580931148092
if(this.jQuery){
    this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict
}

var debug = false;//isProduction("fliggy");

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
    source:"fliggy",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"飞猪"
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
    source:"fliggy",
    type:"travel",
    url:document.location.href
};

var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

(function() {
    'use strict';
    extract();
    //waitForKeyElements (".crumbs span a:contains('自由行预订')", extract);//采集自由行线路
    //commitUrl(seed);//here is an example
})();

function extract(){
    if(debug){console.log("extract hotel ...");}
    params();//从链接中提取标签
    waitForKeyElements (".title-txt", title);
    waitForKeyElements (".item-subtitle", summary);
    waitForKeyElements (".ext-desc-content", summary);
    waitForKeyElements (".item-mileage-title", tags);
    waitForKeyElements (".prop-text", tags_product);
    waitForKeyElements (".item-gallery-thumb__img", images_slide);
    waitForKeyElements (".image-wrap img", images);
    waitForKeyElements (".score",rank_score);
    waitForKeyElements (".item-desc-tabview-commentNum",rank_count);
    waitForKeyElements (".price-content del",price_bid);//原价
    waitForKeyElements (".price-name:contains('促销价')",price_sale);//售价
    waitForKeyElements (".big-price",price_sale2);//售价：没有促销的情况。和有促销的情况为二选一
    waitForKeyElements (".shop-name",seller);//卖家
    sroll_page();
}

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
}

//等待详情图片加载完成并点击“全部评论”tab
function clickCommentsTab(){
    var ele = ".descr-txt-content img";
    var tab = ".item-desc-tabview-item";
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
        setInterval(next, 500);//需要设置页面跳转检查
    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
            setInterval(next, 500);//需要设置页面跳转检查
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
    data.title = jNode.text();
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

function tags_product(jNode){
    var tag = jNode.text().trim();
    if(tag.length>2 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_product");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src").replace(/64x64/,"430x430xz"));
    checkImage(img);
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        //if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            //if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=400 && img.height>=300 && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);
    data.rank.score = score&&score[0]?Number(score[0]):2.5;
    data.rank.base = 5.0;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);
    data.rank.count = count&&count[0]?Number(count[0]):0;
    commit("rank_count");
}

function price_bid(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g)[0];
    data.price.bid = price?Number(price):null;
    commit("price_bid");
}

function price_sale(jNode){
    var price = jNode.parent().text().match(/\d+\.*\d*/g)[0];
    data.price.sale = price?Number(price):null;
    commit("price_sale");
}

function price_sale2(jNode){
    var price = jNode.text().match(/\d+\.*\d*/g)[0];
    data.price.sale = price?Number(price):null;
    commit("price_sale");
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
//https://traveldetail.fliggy.com/item.htm?id=580931148092
function web(link){
    var id = link.match(/id=\d+/);//id=580931148092
    return "https://traveldetail.fliggy.com/item.htm?"+id;
}

//转换为移动链接地址
//web: https://traveldetail.fliggy.com/item.htm?id=580931148092
//wap: https://h5.m.taobao.com/trip/travel-detail/index/index.html?itemId=580931148092&_projVer=0.4.1
function wap(link){
    var ids = link.match(/id=\d+/g);//匹配后返回：id=580931148092
    var id = ids[0].replace(/id=/,"");
    return "https://h5.m.taobao.com/trip/travel-detail/index/index.html?itemId=_product"
        .replace(/_product/,id);
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
    return data.title && data.summary.length>0 && data.images.length>0 && data.price.sale && data.tags.length>0;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



