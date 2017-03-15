module namespace f = 'http://db.hugh.today/functions#';

(: http://www.x-query.com/pipermail/talk/2006-January/001062.html :)
declare function f:strip-namespace( $e as element() ) as element() {
  element { QName( (), local-name( $e ) ) } {
    for $child in $e/( @*, *, text() )
    return
      if ( $child instance of element() )
      then f:strip-namespace( $child )
      else $child
  }
};