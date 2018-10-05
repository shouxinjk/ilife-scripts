<?php
/**
  * wechat php test
  */

//define your token
define("TOKEN", "qchzhu");
$wechatObj = new wechatCallbackapiTest();

//for token validation
//$wechatObj->valid();

//for auto-responding
$wechatObj->responseMsg();

class wechatCallbackapiTest
{
	public function valid()
    {
        $echoStr = $_GET["echostr"];

        //valid signature , option
        if($this->checkSignature()){
        	echo $echoStr;
        	exit;
        }
    }

    public function responseMsg()
    {
		//get post data, May be due to the different environments
		$postStr = $GLOBALS["HTTP_RAW_POST_DATA"];

      	//extract post data
		if (!empty($postStr)){
                
              	$postObj = simplexml_load_string($postStr, 'SimpleXMLElement', LIBXML_NOCDATA);
                $fromUsername = $postObj->FromUserName;
                $toUsername = $postObj->ToUserName;
                $keyword = trim($postObj->Content);
                $time = time();
                $textTpl = "<xml>
							<ToUserName><![CDATA[%s]]></ToUserName>
							<FromUserName><![CDATA[%s]]></FromUserName>
							<CreateTime>%s</CreateTime>
							<MsgType><![CDATA[%s]]></MsgType>
							<Content><![CDATA[%s]]></Content>
							<FuncFlag>0</FuncFlag>
							</xml>";   

				//获取事件类型
				$type=$postObj->MsgType;
				if($type=='event'){
					$event = $postObj->Event;
					if($event=='subscribe'){
						$contentStr= "小确幸，大生活。欢迎关注。";
						$msgType = "text";
						$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
						echo $resultStr;
					}else if($event=='unsubscribe'){
						$contentStr= "客官慢走，欢迎再来。";
						$msgType = "text";
						$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
						echo $resultStr;
					}else if($event=='CLICK'){
						$contentStr= "自定义菜单";
						$msgType = "text";
						$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
						echo $resultStr;
					}
				}else if($type=='location'){
					$label = $postObj->Label;
					$locationX = $postObj->Location_X;
					$locationY = $postObj->Location_Y;
					$msgType = "text";
					$responseTpl="【LOC】%s 【X】%s【Y】%s";
					$contentStr = sprintf($responseTpl,$label,$locationX,$locationY);
					$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
					echo $resultStr;
				}else if($type=='text'){
					if(!empty( $keyword )){//here we return an article list
						$msgType = "news";
						$listTpl=" <xml>
									 <ToUserName><![CDATA[%s]]></ToUserName>
									 <FromUserName><![CDATA[%s]]></FromUserName>
									 <CreateTime>%s</CreateTime>
									 <MsgType><![CDATA[%s]]></MsgType>
									 <ArticleCount>%s</ArticleCount>
									 <Articles>%s</Articles>
									 </xml> ";
						$itemTpl = " <item>
									 <Title><![CDATA[%s]]></Title> 
									 <Description><![CDATA[%s]]></Description>
									 <PicUrl><![CDATA[%s]]></PicUrl>
									 <Url><![CDATA[%s]]></Url>
									 </item>";
						$itemList = "";
						$itemCount = 0;			 

						$retrieve_data_from="es";
						if($retrieve_data_from=="es"){//从搜索引擎获取
							$query_data = array(  
							  'query' => array(
							  	'match' => array(
							  		'full_text' => $keyword
							  	)
							  )
							);
							$es_url = "http://search.pcitech.cn/stuff/_search";
							$result = $this->send_post($es_url,$query_data);
							$json = json_decode($result);
							$hits = $json->hits;
							for($i=0;$i<$hits->total;$i++){
								if($itemCount>4)//we only display 4 items for mobile
									break;
								$object = $hits->hits[$i]->_source;
								$tagstr="";
								for($k=0;$k<count($object->tags);$k++){
									$tag = $object->tags[$k];
									$tagstr = $tagstr." ".$tag;
								}
								$title = $object->title.$tagstr; // title is a field of your content type
								$description = $object->summary;
								$picUrl = 	$object->images[0];//取第一张照片作为LOGO							
								$linkUrl = "http://www.shouxinjk.net/list/info.html?id=".$object->_key;
								$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
								$itemList = $itemList.$itemStr;
								$itemCount ++;
							}
						}else{//从数据库直接读取数据
							//get item list from remote JSON
							$url = "http://data.shouxinjk.net/_db/sea/my/stuff";
							$lines_array = file($url);
							$lines_string = implode('',$lines_array);            
							$json = htmlspecialchars($lines_string,ENT_NOQUOTES);
							$array = json_decode($json);
							for($i=0;$i<count($array);$i++){
								if($itemCount>4)//we only display 4 items for mobile
									break;
								$object = $array[$i]; // The array could contain multiple instances of your content type
								$tagstr="";
								for($k=0;$k<count($object->tags);$k++){
									$tag = $object->tags[$k];
									$tagstr = $tagstr." ".$tag;
								}
								$title = $object->title.$tagstr; // title is a field of your content type
								$description = $object->summary;
								$picUrl = 	$object->images[0];//取第一张照片作为LOGO							
								$linkUrl = "http://www.shouxinjk.net/list/info.html?id=".$object->_key;
								$itemStr = sprintf($itemTpl,$title,$description,$picUrl,$linkUrl);
								$itemList = $itemList.$itemStr;
								$itemCount ++;
							}
						}

						if($itemCount>0){
							$resultStr = sprintf($listTpl, $fromUsername, $toUsername, $time, $msgType,$itemCount, $itemList);
							echo $resultStr;
						}else{
							$contentStr= '没有和"'.$keyword.'"相关的内容。重新尝试看看？';
							$msgType = "text";
							$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
							echo $resultStr;						
						}
					}else{
						echo "【敬请关注】我们正在努力，请稍等稍等";
					}
				}else if($type=='image'){
					$picURL = $postObj->PicUrl;
					$msgType = "text";
					$responseTpl="【Image URL】%s";
					$contentStr = sprintf($responseTpl,$picURL);
					$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
					echo $resultStr;
				}else if($type=='link'){
					$linkURL = $postObj->Url;
					$msgType = "text";
					$responseTpl="【Link URL】%s";
					$contentStr = sprintf($responseTpl,$linkURL);
					$resultStr = sprintf($textTpl, $fromUsername, $toUsername, $time, $msgType, $contentStr);
					echo $resultStr;
				}else{
					echo "当前还不支持语音、图片、链接等形式哦";
				}
        }else {
        	echo "error";
        	exit;
        }
    }
/*
    private function curlPost($url,$post_data){
		// Sets our destination URL
		$endpoint_url = 'https://somesite.com/path/to/endpoint';
		// Creates our data array that we want to post to the endpoint
		$data_to_post = [
			'field1' => 'foo',
			'field2' => 'bar',
			'field3' => 'spam',
			'field4' => 'eggs',
		];
		// Sets our options array so we can assign them all at once
		$options = [
		  	CURLOPT_URL        => $endpoint_url,
			CURLOPT_POST       => true,
			CURLOPT_POSTFIELDS => $data_to_post,
			CURLOPT_HEADER	   => 1,
			CURLOPT_USERPWD	   => 'elastic:changeme'			
		];
		// Initiates the cURL object
		$curl = curl_init();
		// Assigns our options
		curl_setopt_array($curl, $options);
		// Executes the cURL POST
		$results = curl_exec($curl);
		// Be kind, tidy up!
		curl_close($curl);    	
    }
//**/
	private function send_post($url,$post_data){
		$postdata = http_build_query($post_data);
		$options = array(
			'http'=>array(
				'method'=>'POST',
				//'header' => 'Content-type:application/json,Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
				'header'=>'Content-type:application/x-www-form-urlencoded,Authorization:Basic ZWxhc3RpYzpjaGFuZ2VtZQ==',
				'content'=>$postdata
				//'timeout' => 15 * 60 // 超时时间（单位:s）
			)
		);
		$ctx = stream_context_create($options);
		return file_get_contents($url,false,$ctx);
	}

	private function checkSignature()
	{
        $signature = $_GET["signature"];
        $timestamp = $_GET["timestamp"];
        $nonce = $_GET["nonce"];	
        		
		$token = TOKEN;
		$tmpArr = array($token, $timestamp, $nonce);
		sort($tmpArr);
		$tmpStr = implode( $tmpArr );
		$tmpStr = sha1( $tmpStr );
		
		if( $tmpStr == $signature ){
			return true;
		}else{
			return false;
		}
	}
}

if (!function_exists('http_build_query')) {
	function http_build_query($data, $prefix='', $sep='', $key='') {
	   $ret = array();
	   foreach ((array)$data as $k => $v) {
	       if (is_int($k) && $prefix != null) $k = urlencode($prefix . $k);
	       if (!empty($key)) $k = $key.'['.urlencode($k).']';
	       
	       if (is_array($v) || is_object($v))
	           array_push($ret, http_build_query($v, '', $sep, $k));
	       else    array_push($ret, $k.'='.urlencode($v));
	   }
	 
	   if (empty($sep)) $sep = ini_get('arg_separator.output');
	   return implode($sep, $ret);
	}
}

?>
