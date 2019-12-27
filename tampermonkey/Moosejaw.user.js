// ==UserScript==
// @name         Moosejaw
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.moosejaw.com/product/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.moosejaw.com/product/arcteryx-men-s-cerium-lt-jacket_10342603

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = false;

var schema={
//TODO: validate and commit
};

var keys = [];

var data={
    task:{
        user:"userid",//注册的编码
        executor:"machine",//机器标识
            timestamp:new Date().getTime(),//时间戳
            url:window.location.href//原始浏览地址
    },
    url:web(window.location.href),
    type:"outdoor",
    source:"moosejaw",
    title:null,
    summary:"",
    price:{
        currency:"$",
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    props:[],
    distributor:{
        name:"Moosejaw",
        language:"en_US",
        country:"Canada"
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
    }
};

var seed={//an example for extract urls
    task:{
        user:"userid",//注册的编码
        executor:"machine"//机器标识
    },
    source:"moosejaw",
    type:"outdoor",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

(function() {
    'use strict';
    params();
    waitForKeyElements ("#product_name", title);
    waitForKeyElements ("span[itemprop='description']", summary);
    waitForKeyElements ("#productFeatures li", summary);
    waitForKeyElements ("#breadcrumb span[itemprop='title']", tags);
    waitForKeyElements (".item-thumbnail img", images);//logo
    //waitForKeyElements (".detail img", images);//正文部分的图片提取
    waitForKeyElements (".RatingAddtlInfo",rank_score);//评分
    waitForKeyElements (".bv-content-pagination-pages-current",rank_count);//评价数
    waitForKeyElements ("input[id*='ProductInfoPrice_Inner_']",price_sale);
    waitForKeyElements ("#adwordsTotalValue",price_bid);
    waitForKeyElements (".pdp-specifications tr",props);
    //commitUrl(seed);//here is an example
})();

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

function venu(jNode){
    data.venu = jNode.text().replace(/\s+/g,"").replace(/演出场馆：/g,"");
    commit("venu");
}

function tags(jNode){
    var tag=jNode.text().trim();
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function images(jNode){
    var img = fullUrl(jNode.attr("src").replace(/thumb50/,"product700"));//根据缩略图替换得到大图
    if(data.images.indexOf(img)<0)
        data.images.push(img);
    commit("images");
}

function rank_score(jNode){
    var score = Number(jNode.text().trim());//5星。
    data.rank.score = score;
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().match(/\d+/g);//获取最后一个数值
    data.rank.count = Number(count[count.length-1]);
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = Number(jNode.val());
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.val());
    commit("price_bid");
}

function props(jNode){
    if(jNode.find(".pdp-spec-main-cat") && jNode.find("td:last")){
        var key = jNode.find(".pdp-spec-main-cat").text().trim();
        var value = jNode.find("td:last").text().trim();
        var prop = {
            key:key,
            value:value
        };
        if(keys.indexOf(key)<0){
            data.props.push(prop);
            keys.push(key);
        }
        //将产地、品牌、产品剂型作为tag
        if(",Brand,".indexOf(key)>0){
            data.price.sale = Number(value);
        }
        commit("props");
    }
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://www.moosejaw.com/product/arcteryx-men-s-cerium-lt-jacket_10342603
function web(link){
    return "https://www.moosejaw.com"+window.location.pathname;
}

//转换为移动链接地址
//web: https://www.moosejaw.com/product/arcteryx-men-s-cerium-lt-jacket_10342603
//wap: https://www.moosejaw.com/product/arcteryx-men-s-cerium-lt-jacket_10342603
function wap(link){
    return "https://www.moosejaw.com"+window.location.pathname;
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



