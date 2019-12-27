// ==UserScript==
// @name         当当
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract books
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        http://product.dangdang.com/*
// @grant        none
// ==/UserScript==

//示例URL
//http://product.dangdang.com/24202661.html?ref=book-686989-3032_2-2847532-0

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("dangdang");

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
    source:"dangdang",
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
        name:"当当网"
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
    source:"dangdang",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

(function() {
    'use strict';
    checkProfit();
    waitForKeyElements ("#comment_tab", scroll);//评分需要预先点击后才能加载
    waitForKeyElements (".name_info h1", title);
    waitForKeyElements ("#content-show:parent", summary);//内容太长时，仅显示部分
    waitForKeyElements ("#content-all", summary_all);//内容短则显示全部，两者只会出现一个
    waitForKeyElements (".tag_posi a:parent", tags);
    waitForKeyElements ("img[src='images/icon_ddzy.png']", seller);//通过图片进行标记
    waitForKeyElements (".breadcrumb a[name='__Breadcrumb_pub']", category);//类别
    waitForKeyElements (".breadcrumb a[name='__Breadcrumb_pub']:last", tags_category);//将最末级分类作为标签
    waitForKeyElements ("a[dd_name='出版社']",publisher);
    waitForKeyElements ("a[dd_name='作者']",author);
    waitForKeyElements (".big_pic img", images);//logo大图
    waitForKeyElements ("#main-img-slider li a img", images_slide);//幻灯轮播大图
    //waitForKeyElements (".descrip div img", images);//正文部分的图片提取
    waitForKeyElements ("#comment_percent:parent",rank_score);//使用好评比例
    waitForKeyElements ("span[dd_name='全部评论']:contains('（')",rank_count);//评价数
    waitForKeyElements ("#dd-price",price_sale);
    waitForKeyElements ("#original-price:parent",price_bid);

    waitForKeyElements ("#detail_describe li",props);
    //commitUrl(seed);//here is an example
})();

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

function props(jNode){
    var txt = jNode.text().replace(/：/g,":").split(":");//是否含糖: 含糖
    var prop = {
        //key:txt[0],
        //value:txt[1]
    };
    if(txt[0] && txt[0].trim().length>0){
        prop[txt[0].trim()]=txt[1].trim();
        data.props.push(prop);
    }
}

function scroll(jNode){
    var eClick = jQuery.Event( "click" );
    jNode.trigger( eClick );
    /*
    //滚动到页面底部：不 work
    console.log("scrolling page ... ",jNode.offset().top - $(window).height());
    $('body').animate({
        scrollTop: jNode.offset().top - $(window).height()
    }, 1000);
    //**/
}

function title(jNode){
    data.title = jNode.attr("title");
    commit("title");
}

function summary(jNode){
    data.summary = jNode.text().replace(/\s+/g,"").trim();
    commit("summary");
}

function summary_all(jNode){
    data.summary = jNode.parent().text().replace(/\s+/g,"").trim();
    commit("summary");
}

function tags(jNode){
    var tag = jNode.text().replace(/（\d+）/g,"");//原始：内容丰富（6）,替换后返回：内容丰富
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = "当当自营";//如果识别到则直接设置为自营
    commit("seller");
}

function category(jNode){
    var cat = jNode.text().trim();
    if(cat.length>0 && data.category.indexOf(cat)<0){
        data.category.push(cat);
    }
    commit("category");
}

//将分类作为标签
function tags_category(jNode){
    var tag = jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags_category");
}

function publisher(jNode){
    data.producer.name = jNode.text().trim();
}

function author(jNode){
    if(data.props.authors == null || data.props.authors.length == 0){
        data.props.authors = [];
    }
    data.props.authors.push(jNode.text().trim());
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

//小图片地址：http://img3m1.ddimg.cn/82/11/25334281-1_x_8.jpg
//大图片地址：http://img3m1.ddimg.cn/82/11/25334281-1_u_8.jpg
function images_slide(jNode){
    var smallImg = jNode.attr("src");
    var bigImg = smallImg.replace("_x_","_u_");
    var img=fullUrl(bigImg);
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    //console.log("rank score:",jNode.text());
    var score = jNode.text().replace(/\s/g,"").match(/\d+\.*\d+/g);//99.7% 可能包含小数点，可能不包含
    if(score && score.length>0){//当前仅有好评率，转化为5分制好评
        var scoreNumber = Number(score[0]);
        var score5 = (scoreNumber/20).toFixed(1);//保留1位小数
        data.rank.score = Number(score5);
    }
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);//全部（1014）
    if(count && count.length>0){
        data.rank.count = Number(count[0]);
    }
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = Number(jNode.text().replace(/\s/g,"").replace("¥",""));//¥36.5
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().replace(/\s/g,"").replace("¥",""));//¥58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
function web(link){
    var id = link.match(/\d+.html/)[0];//匹配后返回：24202661.html
    return "http://product.dangdang.com/"+id;
}

//转换为移动链接地址
//web: http://product.dangdang.com/24202661.html?ref=book-686989-3032_2-2847532-0
//wap: http://product.m.dangdang.com/product.php?pid=24202661
function wap(link){
    var str = link.match(/\d+.html/)[0];//匹配后返回：24202661.html
    var id = str.match(/\d+/)[0];//匹配后返回：24202661
    return "http://product.m.dangdang.com/product.php?pid="+id;
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
    return data.title && data.category && data.images.length>0 && data.price.sale;
}

//navigate to next url
function next(){
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



