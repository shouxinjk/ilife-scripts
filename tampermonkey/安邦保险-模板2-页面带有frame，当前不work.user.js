// ==UserScript==
// @name         安邦保险-模板2-页面带有frame，当前不work
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract items
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://www.ab95569.com/ConfigurationDetailsPage/indexIframe.do?prono=*
// @grant        none
// ==/UserScript==

//示例URL
//https://www.ab95569.com/ConfigurationDetailsPage/indexIframe.do?prono=L16045&commingsoonProNo=L16045&proName=%E5%AE%89%E9%82%A6%E8%A3%95%E6%B3%B0%E4%B8%A4%E5%85%A8%E4%BF%9D%E9%99%A9%EF%BC%88%E4%B8%87%E8%83%BD%E5%9E%8B%EF%BC%89&indexFlag=1&channelTypeCode=1
//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;

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
    type:"insurance",
    category:[],
    source:"anbang",
    title:null,
    summary:"",
    price:{
        bid:null,
        sale:null
    },
    images:[],
    tags:[],
    distributor:{//平台，如当当，淘宝，携程
        name:"安邦保险商城"
    },
    producer:{//厂商，指商品或服务提供者。服务提供商，书籍出版商，旅行社
        name:""
    },
    seller:{//卖家，即商店，京东自营，当当自营，***旗舰店
        name:"安邦保险商城"
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
    source:"anbang",
    type:"insurance",
    taskUrl:document.location.href,
    url:web(document.location.href)
};

//var timerId = setInterval(clickCommentsTab, 500);
var timerMaxCount = 20;

(function() {
    'use strict';
    waitForKeyElements ("title", title);
    waitForKeyElements (".banTit2", tags_summary);
    //waitForKeyElements (".tit p", category);
    waitForKeyElements (".abf_pdbox img", images_slide);
    waitForKeyElements (".pro_sec img", images);
    //waitForKeyElements ("a[href*=storeId]", seller);
    waitForKeyElements (".details_ins",props);
    waitForKeyElements (".conPrem",price_sale);
    //waitForKeyElements (".J-mPrice",price_bid);
    waitForKeyElements ("meta[name='Keywords']", tags);
    waitForKeyElements ("meta[name='description']", summary);
    //waitForKeyElements (".product-score-sc",rank_score);
    //waitForKeyElements (".J-detail-commentCnt-count",rank_count);//评价数
    //commitUrl(seed);//here is an example
})();

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
    }else{
        if(timerMaxCount--<0){
            clearInterval(timerId);
        }
    }
}

function title(jNode){
    data.title = jNode.text().trim();
    commit("title");
}

function summary(jNode){
    var txt = jNode.attr("content").replace(/\s+/g," ").trim();
    if(txt.length>0){
        data.summary += txt;
        commit("summary");
    }
    //解析属性列表
    //props(jNode);
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
    var tag = jNode.attr("content").split("、");
    for(var i=0;i<tag.length;i++){
        var t = tag[i].trim();
        if(t.length>1 && data.tags.indexOf(t)<0){
            data.tags.push(t);
        }
    }
    commit("tags");
}

function tags_summary(jNode){
    var tag = jNode.text().split("|");
    for(var i=0;i<tag.length;i++){
        var t = tag[i].trim();
        if(t.length>1 && data.tags.indexOf(t)<0){
            data.tags.push(t);
        }
    }
    commit("tags");
}

function seller(jNode){
    data.seller.name = jNode.text().trim();
    commit("seller");
}

function category(jNode){
    var cat = jNode.text().trim();
    if(data.category.indexOf(cat)<0 && ",首页".indexOf(cat)<0 && cat.length<6){
        data.category.push(cat);
        commit("category");
        data.tags.push(cat);//同时作为标签
    }
}

function props(jNode){
    var txtEl = jNode.parent().find("dl:first");
    var valueEl = jNode.parent().find("dd:first");
    if(valueEl && txtEl){
        var key = txtEl.text().trim();
        var value = valueEl.text().replace(/\s+/g," ").trim();
        if(key.length>0&&prop_keys.indexOf(key)<0){
            prop_keys.push(key);
            data.props.push({key:key,value:value});
        }
        commit("props");
    }
}

function images(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}

function images_slide(jNode){
    var img = fullUrl(jNode.attr("src"));
    checkImage(img);
}


//判定尺寸后提交，需要大于400*300
function checkImage(img_url,scroll=false){
    var minWidth = 200;
    var minHeight = 120;
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
        window.scrollTo(0, document.body.scrollTop+document.documentElement.scrollTop+200);//注意：由于图片懒加载，可能导致跳过未加载完成图片，故采用模拟滚动
    }
}

function rank_score(jNode){
    var score = jNode.text().trim();
    data.rank.score = score;
    data.rank.base = "5";
    commit("rank_score");
}

function rank_count(jNode){
    data.rank.count = jNode.text().trim();
    commit("rank_count");
}

function price_sale(jNode){
    var num = jNode.text().match(/\d+\.*\d*/g);
    data.price.sale = num?Number(num[0]):null;
    commit("price_sale");
}

function price_bid(jNode){
    data.price.bid = Number(jNode.text().replace(/\s/g,""));//58.0
    commit("price_bid");
}

//根据浏览器地址处理得到访问地址，除掉spm等临时信息，避免造成重复提交
//https://www.ab95569.com/ConfigurationDetailsPage/indexIframe.do?prono=L16045
function web(link){
    var id = link.match(/prono=[a-zA-Z0-9]+/g);//匹配后返回：prono=L16045
    return "https://www.ab95569.com/ConfigurationDetailsPage/indexIframe.do?PRODUCTID".replace(/PRODUCTID/,id);
}

//转换为移动链接地址
//https://www.ab95569.com/ConfigurationDetailsPage/indexIframe.do?prono=L16045
function wap(link){
    var id = link.match(/prono=[a-zA-Z0-9]+/g);//匹配后返回：prono=L16045
    return "https://www.ab95569.com/ConfigurationDetailsPage/indexIframe.do?PRODUCTID".replace(/PRODUCTID/,id);
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



