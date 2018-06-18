`Parser` defines mutual correspondence between strings (relative
urls) (e.g. "/" "/shop" "/blog?tags=art") and some intermediate
data structure, usually named `Route`. It has two main methods
`parse` and `print`. The first maps urls to their `Route`
representation or to the `null` if given string doesn't have
corresponding `Route`. `print` does the opposite, it takes `Route`
and maps it back to `string`. These two functions are inverses of
each other
