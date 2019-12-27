// ==UserScript==
// @name         京东
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://item.jd.com/*
// @grant        none
// ==/UserScript==

//示例URL
//https://item.jd.com/1101873.html#product-detail
//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("jd");

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
    type:"all",
    category:[],
    source:"jd",
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
    images:[],
    tags:[],
    distributor:{
        name:"京东"
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
    source:"jd",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

(function() {
    'use strict';
    checkProfit();
    waitForKeyElements (".sku-name", title);
    waitForKeyElements (".crumb .item a", category);
    //waitForKeyElements ("#description p:parent", summary);
    waitForKeyElements (".goodshop", good_shop);//好店作为标签
    waitForKeyElements (".item .name", seller);
    //waitForKeyElements (".p-parameter-list li .detail p",props);//不同品类显示属性方式不一样，使用子元素优先的方式
    waitForKeyElements (".p-parameter-list li",props);
    waitForKeyElements ("#spec-img", images);
    waitForKeyElements (".spec-list li img", images_slide);
    waitForKeyElements ("#J-detail-content img", images);
    waitForKeyElements (".p-price .price:parent",price_sale,true);//因为有推荐列表，仅获取第一个价格
    //waitForKeyElements ("#J_StrPriceModBox .tm-price",price_bid);
    waitForKeyElements (".line-thro",price_bid);

    //waitForKeyElements (".J_ReviewsCount:parent",click);//点击“累计评价”
    waitForKeyElements (".tag-list span", tags);//评价
    waitForKeyElements (".comment-percent .percent-con",rank_score);
    waitForKeyElements (".tab-main ul li[data-anchor='#comment'] s:parent",rank_count);//评价数
    sroll_page();
    //commitUrl(seed);//here is an example
})();

function sroll_page(){
    var h = $(document).height()-$(window).height();
    $(document).scrollTop(h);
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
        timerId = setInterval(next, 500);//需要设置页面跳转检查
    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
            timerId = setInterval(next, 500);//需要设置页面跳转检查
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

function good_shop(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("good_shop");
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
    var txt = jNode.text().replace(/\s+/g," ").trim().replace(/：/g,":").split(":");
    var prop = {
        //key:txt[0],
        //value:txt[1]
    };
    prop[txt[0]] = txt[1];
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
    /*
    var imgList = pageConfig.product.imageList;//直接从json获取图片地址列表
    var imgLink = jNode.attr("src");//获取图片地址前缀
    var indexJFS = imgLink.indexOf("/jfs/");
    var prefix = imgLink.substr(0,indexJFS);
    for(var i=0;i<imgList.length;i++){
        var img = fullUrl(prefix+"/s450x450_"+imgList[i]);//手动调整为大图
        //console.log("slide image.",img);
        checkImage(img);
    }
    //*/
    //*
    var img = fullUrl(jNode.attr("src").replace(/s54x54/,"s450x450"));
    checkImage(img);
    //*/
}

//判定尺寸后提交，需要大于300*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=300 && img.height>=300 && data.images.indexOf(img_url)<0){
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
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = Number(jNode.text().match(/\d+\.*\d*/));//2.5万+
    if(jNode.text().indexOf("万")>0){
        data.rank.count = data.rank.count * 10000;
    }
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = Number(jNode.text().match(/\d+\.*\d*/g)[0]);//36.5
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().match(/\d+\.*\d*/g)[0]);//58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://item.jd.com/5089253.html
function web(link){
    var id = link.match(/\d+/)[0];//匹配后返回：5089253
    return "https://item.jd.com/"+id+".html";
}

//转换为移动链接地址
//web: https://item.jd.com/100000287117.html
//wap: https://item.m.jd.com/product/100000287117.html
function wap(link){
    var id = link.match(/\d+/)[0];//匹配后返回：100000287117
    return "https://item.m.jd.com/product/"+id+".html";
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



