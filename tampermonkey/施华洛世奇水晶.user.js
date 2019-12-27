// ==UserScript==
// @name         施华洛世奇水晶
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.swarovski.com.cn/zh-CN/p-*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.swarovski.com.cn/zh-CN/p-5426586/Millennium-%E9%93%BE%E5%9D%A0-%E5%BD%A9%E8%89%B2%E8%AE%BE%E8%AE%A1-%E6%B7%B7%E6%90%AD%E5%A4%9A%E7%A7%8D%E9%95%80%E5%B1%82/

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;//isProduction("swarovski");

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
    source:"swarovski",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"施华洛世奇"
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
var keys=[];
var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"swarovski",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

var startTime = new Date().getTime();//用时间戳控制页面切换时间，开始时间
var commitTime = new Date().getTime()+5*1000;//记录最近一次提交数据时间，每次commit将修改改时间
var durationTime = Math.floor(Math.random()*10+5)*1000;//控制间隔毫秒数 5-15秒
var idleTime = 1000;//提交后等待1秒

var timerId = setInterval(next, 500);//需要设置页面跳转检查

var thumbs = [];//记录懒加载图片数量

(function() {
    'use strict';
    waitForKeyElements ("title", title);
    waitForKeyElements (".copy__bodycopy", summary);
    waitForKeyElements ("script:contains('itemListElement')",category);
    waitForKeyElements (".thumb__image", images_slide);
    waitForKeyElements (".zoom-content__image--source-image", images);
    //waitForKeyElements (".good-tag", tags);//筹款状态作为标签
    //waitForKeyElements (".service-item-text:contains('发货并提供售后')", seller);
    waitForKeyElements (".product-detail__price",price_sale);
    waitForKeyElements (".product-detail__pricing--was",price_bid);
    waitForKeyElements (".product-classifications",props);
    //waitForKeyElements (".comment-top-positive-rate",rank_score);
    //waitForKeyElements (".comment-top-tabs-item:contains('全部')",rank_count);//评价数
    //waitForKeyElements (".comment-top-tabs-item", tags_comment);//评价标签
    //commitUrl(seed);//here is an example
})();

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
    if(tag.length>1 &&tag.length<10 && data.tags.indexOf(tag)<0 && ",首页,".indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function tags_comment(jNode){
    var tag = jNode.text().replace(/\(\d+\)/g,"").trim();
    if(tag.length>1 &&tag.length<10 && data.tags.indexOf(tag)<0 && ",全部,有图,".indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().replace(/^由/,"").replace(/发货并提供售后/,"").trim();
    commit("seller");
}

function category(jNode){
    //console.log("script json txt.",jNode.text());
    var json = JSON.parse(jNode.text().trim());
    //console.log("script json.",json);
    for(var i=0;i<json.itemListElement.length-1;i++){
        var cat = json.itemListElement[i].item.name;
        data.category.push(cat);
        data.tags.push(cat);
        commit("category");
    }
}

function props(jNode){
    var arr = jNode.html().replace(/&nbsp;/g,"").split("<br>");
    //console.log("props txt:",arr);
    for(var i=0;i<arr.length;i++){
        var iter = arr[i].trim().split(":");
        if(iter.length<2){continue;}
        var key = iter[0].trim();
        var value = iter[1].trim();
        var prop = {
            key:key,
            value:value
        };
        if(keys.indexOf(key)<0){
            data.props.push(prop);
            keys.push(key);
        }
        //部分属性作为标签
        if(data.tags.indexOf(value)<0 &&",风格,适用人群".indexOf(key)>0 &&value.length>1 &&value.length<10){
            data.tags.push(value);
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    //放入队列，逐个点击获取大图
    thumbs.push(jNode);
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url,scroll=false){
    var minWidth = 300;
    var minHeight = 180;
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        //if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if(img.width>=minWidth && img.height>=minHeight && data.images.indexOf(img_url)<0){
            data.images.push(img_url);
            commit("images");
        }
    }else{// 否则待加载完成执行
        img.onload = function(){
            //if(debug)console.log('img.onload.width:'+img.width+',height:'+img.height);
            if(img.width>=minWidth && img.height>=minHeight && data.images.indexOf(img_url)<0){
                data.images.push(img_url);
                commit("images");
            }
        }
    }
    if(scroll){//向下滚动页面
        window.scrollTo(0, document.body.scrollTop+document.documentElement.scrollTop+50);//注意：由于图片懒加载，可能导致跳过未加载完成图片，故采用模拟滚动
    }
}

function rank_score(jNode){
    var num = jNode.text().match(/\d+\.*\d*/);
    data.rank.score = num?Number(Number(num[0])/20).toFixed(1):null;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var num = jNode.text().match(/\d+/g);// 全部（1）
    data.rank.count = num?Number(num[0]):null;
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.text().match(/[\d\,\.]+/g);
    data.price.sale = num?Number(num[0].replace(/,/g,"")):null;
    commit("price_sale");
}

function price_bid(jNode){
    var num = jNode.text().match(/[\d\,\.]+/g);
    data.price.bid = num?Number(num[0].replace(/,/g,"")):null;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址
function web(link){
    return window.location.href;
}

//转换为移动链接地址
function wap(link){
    return window.location.href;
}

//commit data
function commit(key){
    commitTime = new Date().getTime();
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
    var duration = new Date().getTime()-startTime;
    var idle = new Date().getTime()-commitTime;
    var isPageTimeout = duration > durationTime && idle > idleTime;
    console.log("\n\n crawling ...",duration,durationTime,idle,idleTime,isPageTimeout);
    if( !debug && isPageTimeout ){_next();}
}



