// ==UserScript==
// @name         拉勾网
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.5
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.lagou.com/jobs/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.lagou.com/jobs/5356075.html

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

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
    source:"lagou",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"拉勾网"
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
var keys=[];
var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"lagou",
    type:"job",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements (".job-name", title);
    waitForKeyElements (".job-advantage span", summary);
    waitForKeyElements (".job-advantage p", summary);
    waitForKeyElements (".job-detail p", summary);
    waitForKeyElements (".job-address h3", summary);
    waitForKeyElements (".job-address .work_addr", summary);
    waitForKeyElements (".job_request p span", tags);
    waitForKeyElements (".position-label li", tags);
    //waitForKeyElements (".send", seller);
    waitForKeyElements (".job_company img", images);
    waitForKeyElements (".rotate_item img", images_slide);
    waitForKeyElements (".job_company .fl", names);
    waitForKeyElements (".ceil-salary",price_sale);
    //waitForKeyElements (".op",price_bid);
    waitForKeyElements (".c_feature li>span",props);
    waitForKeyElements (".j-commentEntry",rank_score);
    waitForKeyElements (".num",rank_count);//评价数
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
    data.title = jNode.text().replace(/\s+/g," ").trim();
    commit("title");
}

function summary(jNode){
    var txt = jNode.text().replace(/\s+/g," ").trim();
    if(txt.length>0){
        data.summary += txt+"<br/>";
        commit("summary");
    }
}

function tags(jNode){
    var tag = jNode.text().replace(/\//g,"").trim();
    if(tag.length>1 &&tag.length<10 && data.tags.indexOf(tag)<0 && ",首页,".indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().replace(/本商品由/,"").replace(/发货/,"").trim();
    commit("seller");
}

function category(jNode){
    data.category.push("all");
    commit("category");
}

function props(jNode){
    var key = jNode.text().trim();
    var value = jNode.parent().text().replace(key,"").trim();
    addProp(key,value);
}

function addProp(key,value){
    var prop = {
        //key:key,
        //value:value
    };
    prop[key]=value;
    if(keys.indexOf(key)<0){
        data.props.push(prop);
        keys.push(key);
    }
    //部分属性作为标签
    if(data.tags.indexOf(value)<0 &&",发展阶段,简称".indexOf(key)>0 &&value.length>1 &&value.length<10){
        data.tags.push(value);
    }
    commit("props");
}

function names(jNode){
    var txt = jNode.text().replace(/\s+/g," ").trim().split(" ");
    addProp("简称",txt[0].trim());
    if(txt.length>1){
        addProp("是否认证",txt[1].trim());
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
    //获取全称作为属性
    addProp("全称",jNode.attr("alt"));
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("data-item"));
    checkImage(img);
}

//判定尺寸后提交，需要大于400*300
function checkImage(img_url){
    var img = new Image();
    img.src = img_url;
    if(img.complete){// 如果有缓存则直接获取
        if(debug)console.log('img.complete.width:'+img.width+',height:'+img.height);
        if( data.images.indexOf(img_url)<0){
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
    console.log("salary",jNode.text());
    var num = jNode.text().replace(/k/g,"000").trim().split("-");
    console.log("salary",num);
    if(num.length>1){
        data.price.sale = Number(num[1]);
    }else{
        data.price.sale = Number(num[0]);
    }
    commit("price_sale");
}

function price_bid(jNode){
    var num = jNode.text().match(/\d+\.*\d*/);
    data.price.bid = num?Number(num[0]):null;
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://www.lagou.com/jobs/5309642.html
function web(link){
    var id = link.match(/\d+\.html/)[0];//匹配后返回：5309642.html
    return "https://www.lagou.com/jobs/PRODUCTID".replace(/PRODUCTID/,id);
}

//转换为移动链接地址
//https://www.lagou.com/jobs/5309642.html
//https://m.lagou.com/jobs/5309642.html
function wap(link){
    var id = link.match(/\d+\.html/)[0];//匹配后返回：5309642.html
    return "https://m.lagou.com/jobs/PRODUCTID".replace(/PRODUCTID/,id);
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



