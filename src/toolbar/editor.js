
/**
内容助手：
1，提供已生成内容及片段复制
2，提供产品、方案转换为链接、卡片等插入内容
*/
var _sxdebug = true;

//默认达人信息
var brokerName = "请登录";
var brokerLogo = "https://biglistoflittlethings.com/ilife-web-wx/images/icon.jpeg";
// var loginUrl = "https://sidebar.biglistoflittlethings.com/login?origin=editor"; //默认登录地址
var loginUrl = "https://sidebar.biglistoflittlethings.com/c2b/toolbar/editor";//目标地址
function sxInitialize(jNode){
    //监听达人扫码绑定消息
    listenPostMessage();

    //植入onSelection事件
    listenSelectionEvent();

    //设置操作按钮：显示或隐藏
    var htmlBtn = "";
    htmlBtn += '<div id="sxHideBtnDiv" class="sxinfo" style="position:fixed;z-index:2147483647;top:0px;right:0px;background-color:#fff;width:50px;height:20px;border-radius:5px;display:none">';
    htmlBtn += '<div style="line-height:22px;color:grey;background-color:#fff">隐藏</div>';
    htmlBtn += '</div>';
    //show btn
    htmlBtn += '<div id="sxShowBtnDiv" class="sxinfo" style="position:fixed;z-index:2147483647;top:0px;right:0;background-color:#fff;width:44px;height:150px;border-radius:5px;padding-left:12px;display:flex">';
    htmlBtn += '<div class="info-general">';
    htmlBtn += '<img class="general-icon" src="'+brokerLogo+'" width="30" height="30"/>';
    htmlBtn += '</div>';
    htmlBtn += '<div class="info-detail" style="text-align:left">';
    htmlBtn += '<div class="info-text info-blank" style="color:#000;font-size:14px;height:100px;background-color:#fff">内<br/>容<br/>助<br/>手</div>';
    htmlBtn += '</div>';

    jNode.append(htmlBtn);

    var html = "";
    html += "<div id='sxDiv' style='position:fixed;z-index:2147483646;top:0px;right:0px;background-color:#fff;min-width:500px;width:500px;height:100%;border-radius:5px;display:none;border-left:1px solid silver;'>";
    //broker info
    html += '<div id="brokerInfoDiv" class="sxinfo" style="background-image:none;display:flex;">';
    html += '<div class="info-general">';
    html += '<img id="broker-logo" class="general-icon" src="'+brokerLogo+'" height="60px" style="margin:10px auto;"/>';
    html += '</div>';
    html += '<div class="info-detail" style="text-align:left">';
    html += '<div id="broker-name" class="info-text info-blank" style="color:#000;font-weight:bold;font-size:14px;">'+brokerName+'</div>';
    html += '<div class="info-text info-blank" id="brokerHint"  style="color:#000">More+内容助手</div>';
    html += '</div>';
    html += '</div>';
    //search result
    html += '<div id="sxListDiv" class="list">';
    html += '<iframe id="sxListFrame" src="'+loginUrl+'" width="100%" height="400px" frameborder="0" sandbox="allow-scripts allow-same-origin">';
    html += '</div>';
    html += "</div>";
    jNode.append(html);

    //读取面板显示状态：通过postMessage向iframe请求cookie得到
    if(_sxdebug)console.log("post message to get sxToolbarStatus ");
    document.getElementById('sxListFrame').contentWindow.postMessage({
      action:"checkToolbarStatus",
    }, "*");//向父窗口发出消息，查询sxAuth

    //调整iframe高度
    var iframeHeight = $('#sxDiv').height()-$('#brokerInfoDiv').height();
    $("#sxListFrame").height(iframeHeight);

    //检查本地toolbar显示状态
    try{
        var toolbarStatus = JSON.parse(localStorage.getItem("sxToolbarStatus"));
        showToolbar(toolbarStatus);
    }catch(err){}

    //检查已登录用户账户
    try{
        var sxUserInfo = JSON.parse(localStorage.getItem("sxUserInfo"));
        // var sxUserInfo = localStorage.getItem("sxUserInfo");
        if(_sxdebug)console.log("sxUserInfo", sxUserInfo);
        //修改界面显示
        updateToolbarInfo(sxUserInfo);
    }catch(err){
        if(_sxdebug)console.log("failed parse userInfo", localStorage.getItem("sxUserInfo"), err );
    }

    //隐藏事件
    $("#sxHideBtnDiv").click(function(event){
        $("#sxHideBtnDiv").css("display","none");
        $("#sxShowBtnDiv").css("display","block");
        $("#sxDiv").css("display","none");

        //存入本地
        localStorage.setItem("sxToolbarStatus", JSON.stringify({show: false}));

        //存入缓存，能够在多个界面中保持一致
        /**
        var data = {
            action:"setToolbarStatus",
            data:{show:false}
        };
        if(_sxdebug)console.log("try to post sxToolbar status message to iframe.",data);
        document.getElementById('sxListFrame').contentWindow.postMessage(data, '*');
        //**/
    });
    $("#sxShowBtnDiv").click(function(event){
        $("#sxShowBtnDiv").css("display","none");
        $("#sxHideBtnDiv").css("display","block");
        $("#sxDiv").css("display","block");

        //存入本地
        localStorage.setItem("sxToolbarStatus", JSON.stringify({show: true}));

        //存入缓存，能够在多个界面中保持一致
        /**
        var data = {
            action:"setToolbarStatus",
            data:{show:true}
        };
        if(_sxdebug)console.log("try to post sxToolbar status message to iframe.",data);
        document.getElementById('sxListFrame').contentWindow.postMessage(data, '*');
        //**/
    });
}

//显示或隐藏toolbar
function showToolbar( toolbarStatus ){
    if (!toolbarStatus) return;
    if(toolbarStatus.show) { //显示则默认打开
        $("#sxShowBtnDiv").css("display","none");
        $("#sxHideBtnDiv").css("display","block");
        $("#sxDiv").css("display","block");
    }else { //否则隐藏
        $("#sxShowBtnDiv").css("display","block");
        $("#sxHideBtnDiv").css("display","none");
        $("#sxDiv").css("display","none");
    }
}

//根据sxToolbarStatus更新界面显示
function updateToolbarInfo( userInfo ){
    if(!userInfo) return;
    if(_sxdebug)console.log("update toolbar with userInfo.", userInfo);
    var nbrokerName = "Hi,"+(userInfo.username?userInfo.username:"")+(userInfo.sxBrokerOrgnization&&userInfo.sxBrokerOrgnization.trim().length>0?("("+userInfo.sxBrokerOrgnization+")"):"");
    //brokerName += "&nbsp;<a href='#' style='font-size:12px;color:silver' id='sxChangeBroker' alt='切换账户'><img width='12' text='切换账户' style='vertical-align:middle; margin: 0 auto; ' src='https://www.biglistoflittlethings.com/ilife-web-wx/images/change.png'/></a>";
    nbrokerName += "&nbsp;<a href='#' style='font-size:12px;color:silver;text-decoration:none' id='sxChangeBroker' alt='切换账户'><span style='width:12px;height:12px;'>⇌</span></a>";
    $("#broker-name").html(nbrokerName);
    if(userInfo.avatar)$("#broker-logo").attr("src",userInfo.avatar);
    $("#sxChangeBroker").click(function(event){ //退出
        //删除sxCookie
        if(_sxdebug)console.log("try to remove broker info.");
        document.getElementById('sxListFrame').contentWindow.postMessage({
            action:"logout",
        }, "*");
        //修改登录信息
        $("#broker-name").html(brokerName);
        $("#broker-logo").attr("src",brokerLogo);
        //停止轮询
        clearInterval(timer);
        //修改iframe页面
        $("#sxListFrame").attr("src",loginUrl);
    });

}

function listenSelectionEvent(){
    //创建浮框
    createSxPanel();
    //对页面添加事件
    addSelectListener();

    //对于页面有iframe的情况需要分别处理
    var iframeEditor = null; //记录iframe框架
    //微信公众号、携程新版、135editor
    iframeEditor = document.getElementById('ueditor_0');
    if(iframeEditor){
        if(_sxdebug)console.log("got iframe document", iframeEditor);
        var iframeDoc = iframeEditor.contentDocument;
        //创建浮框
        //createSxPanel(iframeDoc);
        //添加事件
        addSelectListener(iframeDoc);
    }
    //携程 旧版
    iframeEditor = document.getElementById('baidu_editor_0');
    if(iframeEditor){
        if(_sxdebug)console.log("got iframe document", iframeEditor);
        var iframeDoc = iframeEditor.contentDocument;
        //创建浮框
        //createSxPanel(iframeDoc);
        //添加事件
        addSelectListener(iframeDoc);
    }
    //马蜂窝 旧版
    iframeEditor = document.getElementById('content-mfwediter-iframe');
    if(iframeEditor){
        if(_sxdebug)console.log("got iframe document", iframeEditor);
        var iframeDoc = iframeEditor.contentDocument;
        //创建浮框
        //createSxPanel(iframeDoc);
        //添加事件
        addSelectListener(iframeDoc);
    }    

}

function addSelectListener( documentEl = document ){
    //对页面添加事件
    if(document.addEventListener){
        // documentEl.addEventListener("selectstart", () => { //开始选择
        //   if(_sxdebug)console.log("select start");
        // });
        documentEl.addEventListener("selectionchange", ( event ) => { //选择内容发生变化
          if(_sxdebug)console.log("on selection change");
          actionOnSelection( documentEl);
        });        
    }else{
        // documentEl.onselectstart = () => {
        //   if(_sxdebug)console.log("on select start.");
        // };          
        documentEl.onselectionchange = ( event ) => {
          if(_sxdebug)console.log("on selection change");
          actionOnSelection( documentEl );
        };        
    }
}

function createSxPanel( documentEl = document ){
    var bodyEl = $(documentEl).find("body");
    if(_sxdebug)console.log("got body El", bodyEl);
    var sxpanelHtml = `
            <div id="_sxPanel" style="border:1px solid silver;display:none;position:absolute;z-index:9999999;width:400px;height:320px;background-color:#e2e3e2;">
                <div style="line-height:32px;width:100%;background-color:#aae47c;display:flex;flex-direction:row;align-items:center;">
                    <div style="width:50%;">&nbsp;&nbsp;More+智能助手</div>
                    <div style="width:50%;text-align:right;float:right;">
                        <div style="width:100%;display:none;text-align:right;float:right;vertical-align:middle;" id="_sxImgLoading">
                            <img src="https://www.biglistoflittlethings.com/ilife-web-wx/images/loading.gif" style="display: inline-block; vertical-align: middle;"/>
                        </div>
                    </div>
                </div>
                <textarea id="_sxGenContent" style="height:254px;line-height:24px;border:0;border:none;width:100%;">

                </textarea>
                <div style="line-height:32px;width:100%;background-color:#ffbcb3;text-align:right;__toutiao__wechat__ctrip__135eidtor__xiumieditor">
                    <button id="_sxBtnChange" style="padding:2px 5px;__135btn__xiumibtn">改写</button>
                    <button id="_sxBtnAppend" style="padding:2px 5px;__135btn__xiumibtn">续写</button>
                    <button id="_sxBtnExtend" style="padding:2px 5px;__135btn__xiumibtn">扩写</button>
                    <button id="_sxBtnShrink" style="padding:2px 5px;__135btn__xiumibtn">缩写</button>                
                    <button id="_sxBtnReplaceContent" style="padding:2px 5px;__135btn__xiumibtn">插入/替换</button>&nbsp;&nbsp;
                </div>
            </div>
        `;

    //按内容平台风格微调
    //头条
    if(window.location.href.indexOf("mp.toutiao.com")>0){
        sxpanelHtml = sxpanelHtml.replace(/__toutiao/g,"margin-top:-4px;");
    }else{
        sxpanelHtml = sxpanelHtml.replace(/__toutiao/g,"");
    }
    //公众号
    if(window.location.href.indexOf("mp.weixin.qq.com")>0){
        sxpanelHtml = sxpanelHtml.replace(/__wechat/g,"margin-top:2px;");
    }else{
        sxpanelHtml = sxpanelHtml.replace(/__wechat/g,"");
    }
    //携程游记
    if(window.location.href.indexOf("you.ctrip.com")>0){
        sxpanelHtml = sxpanelHtml.replace(/__ctrip/g,"margin-top:-4px;");
    }else{
        sxpanelHtml = sxpanelHtml.replace(/__ctrip/g,"");
    }
    //135Editor
    if(window.location.href.indexOf("www.135editor.com")>0){
        sxpanelHtml = sxpanelHtml.replace(/__135btn/g,"background-color:transparent;border:0;margin-top:4px;");
        sxpanelHtml = sxpanelHtml.replace(/__135eidtor/g,"margin-top:-6px;");
    }else{
        sxpanelHtml = sxpanelHtml.replace(/__135btn/g,"");
        sxpanelHtml = sxpanelHtml.replace(/__135eidtor/g,"");
    }
    //秀米编辑器
    if(window.location.href.indexOf("xiumi.us")>0){
        sxpanelHtml = sxpanelHtml.replace(/__xiumibtn/g,"background-color:transparent;border:0;margin-top:4px;");
        sxpanelHtml = sxpanelHtml.replace(/__xiumieditor/g,"margin-top:-6px;");
    }else{
        sxpanelHtml = sxpanelHtml.replace(/__xiumibtn/g,"");
        sxpanelHtml = sxpanelHtml.replace(/__xiumieditor/g,"");
    }

    $(documentEl).find("body").append( sxpanelHtml );
    //添加按钮事件，监听
    $("#_sxBtnChange").click(function(){ //发送事件
        if(_sxdebug)console.log("try aigc change...");
       localStorage.setItem("sxCurrentContent", $("#_sxGenContent").val());
       $("#_sxImgLoading").css({display:"block"});
       document.getElementById('sxListFrame').contentWindow.postMessage({
            action:"sxAigcAction",
            data:{
                prompt: "改写",
                content: $("#_sxGenContent").val()
            }
        }, "*");//向子窗口发出消息         
    });
    $("#_sxBtnAppend").click(function(){ //发送事件
        if(_sxdebug)console.log("try aigc append...");
        localStorage.setItem("sxCurrentContent", $("#_sxGenContent").val());
        $("#_sxImgLoading").css({display:"block"});
        document.getElementById('sxListFrame').contentWindow.postMessage({
            action:"sxAigcAction",
            data:{
                prompt: "续写",
                content: $("#_sxGenContent").val()
            }
        }, "*");//向子窗口发出消息         
    });
    $("#_sxBtnExtend").click(function(){ //发送事件
        if(_sxdebug)console.log("try aigc extend...");
        localStorage.setItem("sxCurrentContent", $("#_sxGenContent").val());
        $("#_sxImgLoading").css({display:"block"});
        document.getElementById('sxListFrame').contentWindow.postMessage({
            action:"sxAigcAction",
            data:{
                prompt: "扩写",
                content: $("#_sxGenContent").val()
            }
        }, "*");//向子窗口发出消息         
    });
    $("#_sxBtnShrink").click(function(){ //发送事件
        if(_sxdebug)console.log("try aigc shrink...");
        localStorage.setItem("sxCurrentContent", $("#_sxGenContent").val());
        $("#_sxImgLoading").css({display:"block"});
        document.getElementById('sxListFrame').contentWindow.postMessage({
            action:"sxAigcAction",
            data:{
                prompt: "缩写",
                content: $("#_sxGenContent").val()
            }
        }, "*");//向子窗口发出消息         
    });

    //注意：内容替换操作必须在selection响应中触发

}

//根据内容平台判断是否在监管元素下
function checkElement (element){
    if(_sxdebug)console.log("check element", element)
    //根据平台分别处理:
    //头条
    if(element.getAttribute("class") && element.getAttribute("class").indexOf("ProseMirror")>-1){//头条根据class监听
        if(_sxdebug)console.log("got element attribute", element.getAttribute("class"));
        return true;
    } 
    //公众号：注意是监听iframe内的元素
    if(element.getAttribute("class") && element.getAttribute("class").indexOf("rich_media_content")>-1){//注意是iframe内的根元素
        if(_sxdebug)console.log("got element attribute", element.getAttribute("class"));
        return true;
    } 
    //小红书
    if(element.getAttribute("id") && element.getAttribute("id").indexOf("post-textarea")>-1){//直接监听ID
        if(_sxdebug)console.log("got element id", element.getAttribute("id"));
        return true;
    } 
    //携程：注意是监听iframe内的元素
    if(element.getAttribute("contenteditable") && element.getAttribute("contenteditable").indexOf("true")>-1){// iframe内的body元素 
        if(_sxdebug)console.log("got element body");
        return true;
    } 
    //微博
    if(element.getAttribute("class") && element.getAttribute("class").indexOf("ck-editor__editable")>-1){
        if(_sxdebug)console.log("got element id", element.getAttribute("class"));
        return true;
    } 
    //135editor：注意是监听iframe内的元素
    if(element.getAttribute("class") && element.getAttribute("class").indexOf("view")>-1){//注意是iframe内的根元素
        if(_sxdebug)console.log("got element attribute", element.getAttribute("class"));
        return true;
    }     
    return false;
}

function actionOnSelection(  documentEl = document ){

    const selection = documentEl.getSelection();
    // if(selection.isCollapsed)
    //     return;
    var oRange = selection.getRangeAt(0);
    const oRect = oRange.getBoundingClientRect();
    const text = selection.toString();
    if(_sxdebug)console.log("action on selection", selection,oRange, oRect, text);

    //仅针对目标区域：根据当前选中区域递归parentElement，判断是否在目标元素下
    if(_sxdebug)console.log("check selection isvalid", $(selection.anchorNode).parents());
    var validRange = false;
    $.each($(selection.anchorNode).parents(), function(idx, item) {
        if(_sxdebug)console.log("check parent element", item);
        if( checkElement(item) ){
            validRange = true;
            return;
        }        
    });

    //检查浮框是否存在，如果没有则创建
    var sxPanel = $("#_sxPanel"); //$(documentEl).find("#_sxPanel"); // || $("#_sxPanel");
    var scrollTop = $(document).scrollTop()||$(window).scrollTop();
    if(_sxdebug)console.log("sxPanel selection offset", oRect.top, scrollTop);

    //设置选中值到浮框
    $("#_sxGenContent").val( text );
    //监听替换内容事件：注意，必须针对当前选项操作
    $("#_sxBtnReplaceContent").unbind("click");
    $("#_sxBtnReplaceContent").click(function(){ //将当前窗口内容替换到选中区域：先删除，后增加
        //获取当前内容
        var currentContent = localStorage.getItem("sxCurrentContent");
        if(_sxdebug)console.log("got current content",currentContent);
        //删除当前选中
        oRange.deleteContents();
        if(_sxdebug)console.log("content deleted.", oRange, selection);
        //添加子项
        var span = $("<p>" + currentContent+ "</p>");
        oRange.insertNode(span[0]); // pass the first node in the jQuery object
        oRange.detach();//释放range         

        //清空并隐藏浮框
        //localStorage.setItem("sxCurrentContent","");
        //$("#_sxGenContent").val( "" );
        sxPanel.css({ display: "none"});

    });    

    //设置选中内容到本地存储，用于支持AI操作
    localStorage.setItem("sxCurrentContent", text); //每次选中后重新设置
    localStorage.setItem("sxConversationId", "" ); //重新开始与AI会话

    //调整浮框位置：根据iframe包裹div获取
    var iframeOffsetX = 0;
    var iframeOffsetY = 0;

    //公众号
    var  iframeWrapper = $("#edui1_iframeholder");
    if(iframeWrapper && iframeWrapper.offset()){
        if(_sxdebug)console.log("got iframe offset",iframeWrapper.offset());
        iframeOffsetX = iframeWrapper.offset().left - 95; 
        iframeOffsetY = iframeWrapper.offset().top;   
        scrollTop = 0; //iframe中不考虑滚动条偏移
        if(_sxdebug)console.log("sxPanel iframe offset", iframeOffsetX, iframeOffsetY);
    } 
    //135Editor
    var  iframeWrapper = $("#edui22_iframeholder");
    if(iframeWrapper && iframeWrapper.offset()){
        if(_sxdebug)console.log("got iframe offset",iframeWrapper.offset());
        iframeOffsetX = iframeWrapper.offset().left; 
        iframeOffsetY = iframeWrapper.offset().top;   
        scrollTop = 0; //iframe中不考虑滚动条偏移
        if(_sxdebug)console.log("sxPanel iframe offset", iframeOffsetX, iframeOffsetY);
    } 

    //如果有选中内容则显示浮框，并且跟随选中区域
    if(validRange && text && text.trim().length>0){ //有选中则显示
        if(_sxdebug)console.log("show sxpanel", validRange, text);
        sxPanel.css({
            display:'block',
            top: ( iframeOffsetY + oRect.top + scrollTop + oRect.height + 5 ) + 'px',
            left: ( iframeOffsetX + oRect.left ) +'px',
        });
    }else{ //否则隐藏
        if(_sxdebug)console.log("hide sxpanel", validRange, text);
        sxPanel.css({
            display:'none',
            top: 0,
            left: 0,
        });
    }
}

function listenPostMessage(){
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent,function(e) {
        var key = e.message ? "message" : "data";
        var data = e[key];
        if(_sxdebug)console.log("got message from child window.",data);

        //发送消息到会话框
        if(data && data.action == "sxSendMsg" && data.content && data.content.trim().length>0 ){
            if(_sxdebug)console.log("action: send msg",data.content);
            $("div.simulate-textarea").text(data.content);
            //TODO: 点击发送按钮
            if(_sxdebug)console.log("got btn.",$(".chat_area-button button[title='发送消息']"));
            //$(".chat_area-button button[title='发送消息']").click();
        }

        //接收login信息
        if(data && data.action == "sxLogin" && data.data ){
            if(_sxdebug)console.log("action: change toolbar status",data.data);
            //保存，后续可直接引用
            if(data.data.userInfo){
                localStorage.setItem("sxUserInfo", JSON.stringify(data.data.userInfo));
                //修改界面显示
                updateToolbarInfo(data.data.userInfo);
                //页面跳转
                $("#sxListFrame").attr("src",loginUrl);
            }
        }

        //接收toolbar状态，包括工具条状态及登录信息
        if(data && data.action == "sxToolbarStatus" && data.data ){
            if(_sxdebug)console.log("action: change toolbar status",data.data);
            //保存，后续可直接引用
            //显示状态存储于本地，不通过服务器端处理
            /*
            if(data.data.toolbarStatus){
                localStorage.setItem("sxToolbarStatus", data.data.toolbarStatus);
                showToolbar(data.data.toolbarStatus); //显示或隐藏
            }
            //**/
            if(data.data.userInfo){
                localStorage.setItem("sxUserInfo", JSON.stringify(data.data.userInfo));
                //修改界面显示
                updateToolbarInfo(data.data.userInfo);
            }
        }

        //在新标签页中打开url
        if(data && data.action == "sxRediret" && data.url && data.url.trim().length>0 ){
            if(_sxdebug)console.log("action: redirect",data.url);
            window.open(data.url);
        }

        //接收客户SOP设置，并开始轮询消息
        if(data && data.action == "sxSopCustomer" && data.sop ){
            if(_sxdebug)console.log("action: sxSopCustomer",data.sop);
            //开始轮询客户消息列表，并启动定时器
            timeoutAutoReply = data.sop.threshold?data.sop.threshold:180;
            timeoutNotify = timeoutAutoReply-180>0?timeoutAutoReply-180:timeoutAutoReply/2; //默认预留3分钟用于通知后处理，否则用超时时长一半
            loopCustomerMsgs();
        }

        //发布内容到编辑框：替换
        if(data && data.action == "sxPublishContent" && data.content && data.content.trim().length>0 ){
            if(_sxdebug)console.log("action: sxPublishContent ",data);
            setSxContent(data.title, data.content);
        }

        //发布内容到编辑框：添加
        if(data && data.action == "sxAppendContent" && data.content && data.content.trim().length>0 ){
            if(_sxdebug)console.log("action: sxAppendContent ",data);
            appendSxContent(data.content);
        }

        //添加图片到编辑框
        if(data && data.action == "sxAppendImage" && data.url && data.url.trim().length>0 ){
            if(_sxdebug)console.log("action: sxAppendImage ",data);
            appendSxImage(data.url);
        }

        //接收到AIGC结果
        if(data && data.action == "sxAigcAction"){
            if(_sxdebug)console.log("action: sxAigcAction ",data);
            $("#_sxImgLoading").css({display:"none"});
            //根据prompt类型，分别处理内容到本地缓存
            var currentContent = localStorage.getItem("sxCurrentContent"); //获取当前缓存内容
            if( data.data.prompt === "续写" ){
                currentContent = currentContent + data.data.content;
            }else{
                currentContent = data.data.content;
            }
            localStorage.setItem("sxCurrentContent", currentContent ); //设置到缓存
            $("#_sxGenContent").val( currentContent ); //更新到界面
        }

    },false);
}

//将内容发布到编辑框：替换
function setSxContent( title, content ){
    if(window.location.href.indexOf("mp.toutiao.com")>0){ //头条
        //设置内容
        $(".ProseMirror").empty();
        $(".ProseMirror").append(content); 
        //设置标题
        $(".editor-title textarea").val(title);
        $(".editor-title pre").text(title);
        $(".editor-title textarea").val(title);
    }else if(window.location.href.indexOf("mp.weixin.qq.com")>0){ //公众号
        //设置内容: body.rich_media_content
        var contentArea = $(document.getElementById('ueditor_0').contentDocument).find("body")
        contentArea.empty();
        contentArea.append(content); 
        //设置标题
        $("#title").val(title);
    }else if(window.location.href.indexOf("creator.xiaohongshu.com")>0){ //小红书 
        //设置内容
        $("#post-textarea").empty();
        $("#post-textarea").append(content); 
        //设置标题
        $(".titleInput input").val(title);
    }else if(window.location.href.indexOf("you.ctrip.com/TravelSite/Member/EditClassicTravel")>0){ //携程 旧版
        //设置内容: body
        var contentArea = $(document.getElementById("baidu_editor_0").contentDocument).find("body")
        contentArea.empty();
        contentArea.append(content); 
        //设置标题
        $("#title").val(title);
    }else if(window.location.href.indexOf("you.ctrip.com/TravelSite/Member/EditNewTravel")>0){ //携程 新版
        //设置内容: body.rich_media_content
        var contentArea = $(document.getElementById('ueditor_0').contentDocument).find("body")
        contentArea.empty();
        contentArea.append(content); 
        //设置标题
        $(".yj_write_title").val(title);
    }else if(window.location.href.indexOf("you.ctrip.com/TravelSite/Member/EditClassicTravel")>0){ //马蜂窝 旧版 
        //设置内容: body
        var contentArea = $(document.getElementById("content-mfwediter-iframe").contentDocument).find("body")
        contentArea.empty();
        contentArea.append(content); 
        //设置标题
        $("#title").val(title);
    }else if(window.location.href.indexOf("card.weibo.com")>0){ //微博
        //设置内容
        $(".ck-editor__editable").empty();
        $(".ck-editor__editable").append(content); 
        //设置标题
        $(".title_ipt textarea").val(title);
    }else if(window.location.href.indexOf("www.135editor.com")>0){ //135Editor
        //设置内容: body.rich_media_content
        var contentArea = $(document.getElementById('ueditor_0').contentDocument).find("body")
        contentArea.empty();
        contentArea.append(content); 
        //设置标题
        // $("#title").val(title);
    }else if(window.location.href.indexOf("xiumi.us")>0){ //秀米编辑器
        //设置内容
        $("div[tn-cell='txt1']").html("<p></p>");
        $("div[tn-cell='txt1']").append(content); 
        //设置标题
        $(".tn-meta-panel input.title").val(title);
    }
}

function onLoginSuccess( code ){
    console.log("got onLoginSuccess callback.", code);
}


//将内容发布到编辑框：添加
function appendSxContent( content ){
    if(window.location.href.indexOf("mp.toutiao.com")>0){ //头条
        //尝试获取当前鼠标位置
        // const selection = document.getSelection();
        if (document.selection && document.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = document.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            $(".ProseMirror").append(content); 
        }
    }else if(window.location.href.indexOf("mp.weixin.qq.com")>0){ //公众号
        var docEl = document.getElementById('ueditor_0').contentDocument;
        if (docEl.selection && docEl.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = docEl.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            var contentArea = $(docEl).find("body")
            contentArea.append(content); 
        }
    }else if(window.location.href.indexOf("creator.xiaohongshu.com")>0){ //小红书
        //尝试获取当前鼠标位置
        // const selection = document.getSelection();
        if (document.selection && document.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = document.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            $("#post-textarea").append(content); 
        }
    }else if(window.location.href.indexOf("you.ctrip.com/TravelSite/Member/EditClassicTravel")>0){ //携程旧版
        var docEl = document.getElementById("baidu_editor_0").contentDocument;
        if (docEl.selection && docEl.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = docEl.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            var contentArea = $(docEl).find("body")
            contentArea.append(content); 
        }
    }else if(window.location.href.indexOf("you.ctrip.com/TravelSite/Member/EditNewTravel")>0){ // 携程新版
        var docEl = document.getElementById('ueditor_0').contentDocument;
        if (docEl.selection && docEl.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = docEl.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            var contentArea = $(docEl).find("body")
            contentArea.append(content); 
        }
    }else if(window.location.href.indexOf("www.mafengwo.cn/ginfo/create")>0){ //马蜂窝旧版
        var docEl = document.getElementById("content-mfwediter-iframe").contentDocument;
        if (docEl.selection && docEl.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = docEl.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            var contentArea = $(docEl).find("body")
            contentArea.append(content); 
        }
    }else if(window.location.href.indexOf("card.weibo.com")>0){ //微博
        //尝试获取当前鼠标位置
        // const selection = document.getSelection();
        if (document.selection && document.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = document.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            $(".ck-editor__editable").append(content); 
        }
    }else if(window.location.href.indexOf("www.135editor.com")>0){ //135Editor
        var docEl = document.getElementById('ueditor_0').contentDocument;
        if (docEl.selection && docEl.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = docEl.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            var contentArea = $(docEl).find("body")
            contentArea.append(content); 
        }
    }else if(window.location.href.indexOf("xiumi.us")>0){ //秀米编辑器
        if (document.selection && document.selection.createRange) { //插入光标或选区之后
            console.log("try insert to selection.", content);
            var range = document.selection.createRange();
            range.collapse(false);//插入选区之后
            range.pasteHTML(content);
        }else{
            console.log("try append.", content);
            $("div[tn-cell='txt1']").append(content); 
        }
    }
}

//将图片组织为html加入
function appendSxImage( imageUrl ){
    //组织图片 html 
    var  content = `<p><img src="__imgsrc"/></p>`;
    content = content.replace(/__imgsrc/g,imageUrl);
    if(_sxdebug)console.log("try insert image.",content);
    appendSxContent( content );
}

var timerInterval = 300; //轮询间隔
var timeoutNotify= 120; //提醒超时默认为2分钟
var timeoutAutoReply= 180; //自动回复超时默认为2分钟
var sxTimers = new Array(); //定时器列表
var companyName = ""; //TODO：需要根据用户设置读取
var testSent = false;
var timer = null;
function loopCustomerMsgs( ){
    var currentTimestamp = new Date().getTime();
    timer = setInterval( function () {
            //if(_sxdebug)console.log("check customer msg ...");
            $(".im_friend-queue li>a").each(function(){ //获取所有消息列表
                var msg = {
                    channelName: "vBooking",//根据当前站点设置
                    channelType: "ota",
                    contentType: "text", 
                    toUser: $(this).find("strong.nick").text(),
                    fromUser: $(this).find("em.message-name").text(),
                    msg: $(this).find("em.newmessage").text(),
                    time:$(this).find("span.date").text(),
                    startTimeout: currentTimestamp, //开始计时时间戳
                    notifyTimeout: currentTimestamp + timeoutNotify * 1000, //提醒超时
                    autoReplyTimeout: currentTimestamp + timeoutAutoReply * 1000, //自动回复超时
                }
                //if(_sxdebug)console.log("check msg",msg);

                //仅用于测试
                if(!testSent){
                    document.getElementById('sxListFrame').contentWindow.postMessage({
                        action:"sendAutoReply",
                        data:msg
                    }, "*");//向子窗口发出消息 
                    testSent = true;
                }

                //查询是否已经在列表，并检查时间
                var idx = sxTimers.findIndex( item => item.toUser == msg.toUser);
                if( idx >= 0 ){ //检查是否超时并处理
                    var timer = sxTimers[idx];
                    if(timer.notifyTimeout && timer.notifyTimeout >= currentTimestamp - timerInterval ){ //该发送通知了
                        if(_sxdebug)console.log("msg timeout notify.", timer);
                        //发送通知
                        document.getElementById('sxListFrame').contentWindow.postMessage({
                            action:"sendNotify",
                            data:msg
                        }, "*");//向子窗口发出消息
                        timer.notifyTimeout = null;
                        sxTimers.splice(idx,1,timer);
                    }else if(timer.autoReplyTimeout && timer.autoReplyTimeout >= currentTimestamp - timerInterval ){ //该自动回复了
                        if(_sxdebug)console.log("msg timeout autoreply.", timer);
                        //TODO：自动回复： 注意，需要切换到相应用户，后者直接通过API调用完成
                        $("div.simulate-textarea").text("auto reply test");
                        //并发送通知
                        document.getElementById('sxListFrame').contentWindow.postMessage({
                            action:"sendAutoReply",
                            data:msg
                        }, "*");//向子窗口发出消息                        
                        timer.notifyTimeout = null;
                        timer.autoReplyTimeout = null;
                        sxTimers.splice(idx,1,timer);
                    }else{ //继续等待
                        if(_sxdebug)console.log("timer countinue.", timer);
                    }
                }else if( msg.fromUser != companyName ){ //表示是客人发的消息，需要加入timer列表
                    sxTimers.push(msg);//加入定时器
                }else{ //认为是已经回复的消息，需要清除定时器
                    if(_sxdebug)console.log("clear timer", msg)
                    sxTimers.splice(idx,1);
                }
            });
        }, timerInterval);
}

