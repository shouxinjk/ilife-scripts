<?php

/**
*jd access token
*/

$response_type = "code";
$grant_type = "authorization_code";
$client_id = "cbc3eae9b86541bd952bc9b419429cf3";
$client_secret = "162cc9136bb9e6e36697fce077079e50cfde9e7c";
$redirect_uri = "http://www.biglistoflittlethings.com/oauth/pdd.php";
$state = "pddunion";
$codeurl = 'https://jinbao.pinduoduo.com/open.html';
$tokenurl = "https://open-api.pinduoduo.com/oauth/token?";
$apiurl = " http://gw-api.pinduoduo.com/api/router";

$code = $_GET["code"];

$pid = "20434335_206807608";
$custom_parameters ="20434335";//是uid，用于后续支持自定义参数


if ($code != "")
{
  $fields = [
      "client_id" => urlencode($client_id),
      "code" => urlencode($code),
      "grant_type" => urlencode($grant_type),
      "client_secret" => urlencode($client_secret),
      "pid" => urlencode($pid),
      "custom_parameters" => urlencode($custom_parameters)
  ];
/*
  $fields_string = "";
  foreach($fields as $key=>$value) {
     $fields_string .= $key.'='.$value.'&';
  }
  rtrim($fields_string, '&');

  $ch = curl_init();
  curl_setopt($ch, CURLOPT_URL, $tokenurl.$fields_string);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  $result = curl_exec($ch);
  curl_close($ch);
//**/

  $data = json_encode($fields);
  $curl = curl_init($tokenurl);
  curl_setopt($curl, CURLOPT_HEADER, false);
  curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($curl, CURLOPT_HTTPHEADER, array("Content-type: application/json"));
  curl_setopt($curl, CURLOPT_POST, true);
  curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
  $result = curl_exec($curl);
  curl_close($curl);


  echo "Response：<br />".mb_convert_encoding($result,"UTF-8","UTF-8");

}
else
{
  header("Location: ".$codeurl."?response_type=".$response_type."&client_id=".$client_id."&redirect_uri=".$redirect_uri."&state=".$state);
}

?>
