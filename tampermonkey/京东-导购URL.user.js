// ==UserScript==
// @name         京东-导购URL
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  extract free tour lines
// @author       qchzhu

// @require http://118.190.75.121/dist/waitForKeyElements.js
// @require http://118.190.75.121/dist/md5.js
// @require http://118.190.75.121/dist/util.js?v=2.4
// @icon    http://www.shouxinjk.net/favicon.ico
// @match        https://union.jd.com/proManager/custompromotion
// @grant        none
// ==/UserScript==

//示例URL
//https://union.jd.com/proManager/custompromotion
//在完成登陆后，启动脚本开始自动批量生成导购链接
//1，获取10个待补充条目。条件：source=jd && url2 is null
//2，逐个填写，并点击生成按钮，获取目标地址，更新到服务器
//3，完成后获取下一个内容，如果本地为空，则获取另外10个条目，直至结束

//this.$ = this.jQuery = jQuery.noConflict(true);//important: to remove jQuery conflict

var debug = true;
var items = [];

var remote = "/api/receivecode/getCode";
var form = {data:{
    materialType:7,
    promotionId:1832665234,
    promotionType:1,
    promotionTypeId:1537340369,
    receiveType:"cps",
    wareUrl:"",//需要动态获取链接并更新
    isSmartGraphics:0}
    };

var queryTemplate={
    collection : "my_stuff",
    limit:5,//默认每次取5条
    example : {
        source:"jd",
        "link.web2":null//TODO：当前不能直接用null值，需要先将字段置空后更新
    }
};

(function() {
    'use strict';
    loadItems();
})();

function generateCode(){
    var item = items.pop()[0];
    if(debug)console.log("processing item.",item,item.url);
    var data={
        _key:item._key,
        url:item.url,//required 作为整条记录唯一识别码
        link:{
            web2:null,
            wap2:null
        }
    };
    webLink(item,data);//处理web链接
    //wapLink(item,data);//处理wap链接:放到webLink回调内
}

function webLink(item,data){
    if(debug)console.log("processing item web.",item,item.url);
    form.data.wareUrl = item.link.web;
    if(debug)console.log("processing form web.",form);
    $.ajax({
        type: "POST",
        url: remote,
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(form),
        success: function (result) {
            console.log("cps web",result.data);
            if(result.data.code==200){//仅在有导购链接时才会返回，对于不参与导购的url则返回状态4xx
                var cpsLink = result.data.data;
                console.log("cps link web",cpsLink);
                data.link.web2 = cpsLink.longCode;
                //继续处理移动端链接
                wapLink(item,data);
            }else{//否则，好吧，这里做无用功了
                console.log("no cps link web.",form);
                data.link.web2 = item.link.web;
                data.link.wap2 = item.link.wap;
                //提交数据
                commit(item._key,data);
            }
        }
    });
}

function wapLink(item,data){
    if(debug)console.log("processing item wap.",item,item.url);
    form.data.wareUrl = item.link.wap;
    if(debug)console.log("processing form wap.",form);
    $.ajax({
        type: "POST",
        url: remote,
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(form),
        success: function (result) {
            console.log("cps wap",result.data);
            if(result.data.code==200){//仅在有导购链接时才会返回，否则返回4xx
                var cpsLink = result.data.data;
                console.log("cps link wap",cpsLink);
                data.link.wap2 = cpsLink.longCode;
            }else{//否则，好吧，这里做无用功了
                console.log("no cps link web.",form);
                data.link.wap2 = item.link.wap;
            }
            //提交数据
            commit(item._key,data);

        }
    });
}

//commit data
function commit(key,data){
    if(validate(data)){
        if(debug)console.log("validate succeed. [prop]"+key,data);
        commitData(data,next);
    }else{
        if(debug)console.log("validate failed.[prop]"+key,data);
    }
}

//validate url2 is there
function validate(data){
    return data.link.wap2 && data.link.web2; //两者都处理完成后才提交
}

//navigate to next url
function next(){
    console.log("process next item...");
    if(items.length>0){
        generateCode();
    }else{
        loadItems();
    }
}

function loadItems(){
    if(debug)console.log("load pending items.");
    queryData(queryTemplate,function(result){
        if(debug)console.log("got result.",result);
        if(result.count>0){
            items.push(result.result);
            generateCode();//start generate code
        }else{
            if(debug)console.log("no more items");
        }
    })
}



