// ==UserScript==
// @name         有赞
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://detail.youzan.com/show/goods?alias=*
// @grant        none
// ==/UserScript==

//示例URL
//https://detail.youzan.com/show/goods?alias=3eo2haid2cc1k&banner_id=f.47842302~groupon.5~1~sFVnqwFy&components_style_size=0&components_style_groupon_type=0&reft=1556095099826_1556095117360&spm=seckg461359229_f.47842302

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
    source:"youzan",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{
        name:"有赞商城"
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
    source:"youzan",
    type:"all",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 40;
var lazyImages = [];//记录懒加载图片数量

(function() {
    'use strict';
    waitForKeyElements (".goods-title", title);
    waitForKeyElements (".goods-detail p", summary);
    waitForKeyElements (".swiper-image img", images);
    //waitForKeyElements (".good-tag", tags);
    waitForKeyElements (".shop-name", seller);
    waitForKeyElements (".goods-detail img", images);
    waitForKeyElements (".goods-current-price",price_sale);
    waitForKeyElements (".goods-origin-price",price_bid);
    //waitForKeyElements (".m-attrList li",props);
    //waitForKeyElements (".comment-top-positive-rate",rank_score);
    //waitForKeyElements (".comment-top-tabs-item:contains('全部')",rank_count);//评价数
    //waitForKeyElements (".comment-top-tabs-item", tags_comment);//评价标签
    //commitUrl(seed);//here is an example
})();

//等待详情图片加载完成并点击“全部评论”tab
//冗余：由于采用懒加载，避免超时，设置10秒等候时间单独加载
function clickCommentsTab(){
    var imgSelector = ".hide-in-module-list img";
    var commentBtnSelector = ".info-nav-item:contains('评论')";
    if($(imgSelector) && $(imgSelector).length>0){//确认采集图片并执行点击事件
        $(imgSelector).each(function(){
            var imgUrl = $(this).attr("src");
            if(lazyImages.indexOf(imgUrl)<0){
                lazyImages.push(imgUrl);
            }
            checkImage(imgUrl);//采集图片
            //滚动到页面底部加载其他图片
            window.scrollTo(0, document.body.scrollTop+document.documentElement.scrollTop+50);//注意：由于图片懒加载，可能导致跳过未加载完成图片，故采用模拟滚动
        });
        if(lazyImages.length >= $(imgSelector).length){//表示正文图片加载完成
            if(debug){console.log("\n\n\ncomplete, now change tab\n\n\n");}
            var eClick = jQuery.Event( "click" );
            $(commentBtnSelector).trigger( eClick );
            clearInterval(timerId);//清除定时器
        }
    }
    if(timerMaxCount--<0){//如果到达等待时长，则自动结束
        clearInterval(timerId);
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
    data.seller.name = jNode.text().replace(/\s+/,"");
    commit("seller");
}

function category(jNode){
    data.category.push("all");
    commit("category");
}

function props(jNode){
    if(jNode.find(".name") && jNode.find(".value")){
        var key = jNode.find(".name").text().trim();
        var value = jNode.find(".value").text().trim();
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
    var num = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = num&&num[0]?Number(num[0]):null;
    commit("price_sale");
}

function price_bid(jNode){
    var num = jNode.text().match(/\d+\.*\d*/g);
    data.price.bid = num&&num[0]?Number(num[0]):null;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://detail.youzan.com/show/goods?alias=3eo2haid2cc1k
function web(link){
    var id = link.match(/alias=[^&]+/)[0];//匹配后返回：alias=3eo2haid2cc1k
    return "https://detail.youzan.com/show/goods?PRODUCTID".replace(/PRODUCTID/,id);
}

//转换为移动链接地址
//https://h5.youzan.com/v2/goods/3eo2haid2cc1k
function wap(link){
    var id = link.match(/alias=[^&]+/)[0];//匹配后返回：alias=3eo2haid2cc1k
    return "https://h5.youzan.com/v2/goods/PRODUCTID".replace(/PRODUCTID/,id).replace(/alias=/,"");
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



