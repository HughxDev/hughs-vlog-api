import module namespace f = 'http://db.hugh.today/functions#' at 'queries/modules/functions.xqm';

${namespaces}

declare boundary-space strip;

declare function f:findVideosByTitle( $title as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )
  
  return <hvml>{ 
    for $video in $vlog//hvml:video[hvml:title[text() contains text { $title } any word]]
      return f:strip-namespace( $video )
  }</hvml>
};

declare function f:findVideosByPublishedDate( $date as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )
  
  return <hvml>{
    for $video in $vlog//hvml:video[hvml:published[contains(., $date)]]
      return f:strip-namespace( $video )
  }</hvml>
};

declare function f:findVideosByPublishedDateRange( $dateMin as xs:string, $dateMax as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )
  
  return
    <hvml>{
      for $video in $vlog//hvml:video[hvml:published > $dateMin and hvml:published < $dateMax]
        return f:strip-namespace( $video )
    }</hvml>
};

declare function f:findVideosByRecordedDate( $date as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )
  
  return <hvml>{
    for $video in $vlog//hvml:video[hvml:recorded[contains(., $date)]]
      return f:strip-namespace( $video )
  }</hvml>
};

declare function f:findVideosByRecordedDateRange( $dateMin as xs:string, $dateMax as xs:string ) {
  let $vlog := db:open( 'hughs-vlog', 'vlog.hvml' )
  
  return
    <hvml>{
      for $video in $vlog//hvml:video[hvml:recorded > $dateMin and hvml:recorded < $dateMax]
        return f:strip-namespace( $video )
    }</hvml>
};