// ==UserScript==
// @name         Backcountry
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract freetour line
// @author       qchzhu
// @require http://code.jquery.com/jquery-latest.js
// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.backcountry.com/*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.backcountry.com/patagonia-nano-puff-insulated-jacket-mens?skid=PAT01I3-COPORE-S&INT_ID=REC_home|home_NA_NA_REC-RR_REC-PAT01I3_NA_20181124&ti=UkVDX2hvbWV8aG9tZV9OQV9OQV9SRUMtUlJfUkVDLVBBVDAxSTNfTkFfMjAxODExMjQ=

this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

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
    source:"backcountry",
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
        name:"Backcountry",
        language:"en_US",
        country:"America"
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
    source:"backcountry",
    type:"outdoor",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

(function() {
    'use strict';
    //判定是否是商品页面，根据是否有skid参数完成
    if(window.location.href.indexOf("skid=")>0){
        params();
        waitForKeyElements (".qa-product-title", title);
        waitForKeyElements (".ui-product-details__description p", summary);
        waitForKeyElements (".product-details-accordion__bulletpoint", summary);
        waitForKeyElements (".qa-breadcrumb-link", tags);//使用分类
        waitForKeyElements (".qa-brand-logo", brand);//
        waitForKeyElements (".qa-flexslider__img", images);//slide
        //waitForKeyElements (".detail img", images);//正文部分的图片提取
        waitForKeyElements (".summary-box__average",rank_score);//评分
        waitForKeyElements (".review-count",rank_count);//评价数
        waitForKeyElements (".product-pricing__retail",price_sale);//对于无优惠的价格为retail
        waitForKeyElements (".product-pricing__sale",price_sale);//对于有优惠的价格为sale（与inactive成对出现）
        waitForKeyElements (".product-pricing__inactive",price_bid);
        waitForKeyElements (".ui-product-details__techspec-row",props);
        //commitUrl(seed);//here is an example
    }else{
        console.log("This is not a product page....");
    }
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

function brand(jNode){
    var tag=jNode.attr("alt");
    if(tag.length>0 && data.tags.indexOf(tag)<0){
        data.tags.push(tag);
    }
    commit("tags");
}

function images(jNode){
    if(jNode.attr("data-large-img")){
        var img = fullUrl(jNode.attr("data-large-img"));//根据缩略图替换得到大图
        if(data.images.indexOf(img)<0)
            data.images.push(img);
        commit("images");
    }
}

function rank_score(jNode){
    var score = jNode.text().match(/\d+\.*\d*/g);
    data.rank.score = Number(score[0]);
    data.rank.base = 5;
    commit("rank_score");
}

function rank_count(jNode){
    var count = jNode.text().trim();
    data.rank.count = Number(count);
    commit("rank_count");
}

function price_sale(jNode){
    data.price.sale = Number(jNode.text().trim().replace(/\$/g,""));
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().trim().replace(/\$/g,""));
    commit("price_bid");
}

function props(jNode){
    if(jNode.find(".ui-product-details__techspec-name") && jNode.find(".ui-product-details__techspec-value")){
        var key = jNode.find(".ui-product-details__techspec-name").text().trim();
        var value = jNode.find(".ui-product-details__techspec-value").text().trim();
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
//https://www.backcountry.com/patagonia-nano-puff-insulated-jacket-mens?skid=PAT01I3-COPORE-S
function web(link){
    var q = _getQuery();
    return "https://www.backcountry.com"+window.location.pathname+"?skid="+q.skid;
}

//转换为移动链接地址
//web: https://www.backcountry.com/patagonia-nano-puff-insulated-jacket-mens?skid=PAT01I3-COPORE-S
//wap: https://www.backcountry.com/patagonia-nano-puff-insulated-jacket-mens?skid=PAT01I3-COPORE-S
function wap(link){
    var q = _getQuery();
    return "https://www.backcountry.com"+window.location.pathname+"?skid="+q.skid;
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



