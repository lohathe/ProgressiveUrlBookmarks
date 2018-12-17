# Progressive Url Bookmarks

A simple firefox extension that helps keeping track of progressive url (e.g., series, lessons).
It does not require any login or any communication with any server: it just manages *your* bookmarks in a smart way.

The main goal is to be able to bookmark a progressive url and automatically delete any previous bookmark of the same content but with a preceding progressive number.
> **Example**
> You are watching the series TheSeries1 at my.streaming.site. You are at episode 4 and you saved in your bookmarks the url my.streaming.site/TheSeries1/episode4 corresponding to this last viewed episode. 
> Then you watch 2 more episodes and you then bookmark the url for episode 6.
> By bookmarking this url with this extension, in your bookmark there will be only the bookmark for episode 6 because the extension deleted the bookmark of episode 4 since it is no more useful. And this is done by only adding a new bookmark: there is no need to manually search and delete the previous bookmark!

## Features
* will create a dedicated bookmark folder and it will manage only bookmarks saved in that folder. All previous bookmarks will not be touched: no need to backup
* import into the dedicated bookmark folder the bookmarks saved in other folders at any given time. Every time bookmarks are added they will be filtered and only the last occurrence of the progressive url will be kept: the list of the progessive bookmark is always tidy and up-to-date
* specify rules teaching the extension how to understand which urls are to be managed and how to extract data from them (i.e., extract title and progression number). As a side effect if you are using several sites that offer the same progressive content, there will be only one bookmark per content independently from which site has been used to bookmark the content
* each rule can have a mnemonic name selected by the user. Otherwie the name will be automatically generated from the domain of the url
* list the last bookmarked contents as links so that they can be easily reached without the need to navigate inside the dedicate bookmark folder. List also all the content currently traked when explicitly requested
* try to open the current content with any other site listed with a rule (as long as it does not contain any wildcard). This is a best effort since the same content in different sites is not guaranteed to exist

### Future feature
* account also for an optional "season" number

## User interface
### Popup
* clearly show the content name, progression number and the name of the matching rule of the current url (if it matches the user-specified rules)
* show if the current url is already bookmarked or not: use a feather icon as a background image
* show if the current url refers to content that is already tracked:
   * use a green background color if the content is already tracked and the current url has a bigger progression number
   * use a red background color if the content is already tracked and the current url has a smaller (or equal) progression number
   * use a yellow background color if the content is not already tracked
* button to add the current url to the tracker (which will automatically removes all previous bookmark of the same content, if any)
* button to un-track the current url and the relative content
* small list of the last tracked content. All entries are in fact links and are clickable (as normal bookmarks are)
* submenu to list all the tracked content. All entries are in fact links and are clickable (as normal bookmarks are)
* submenu "open with rule..." listing the links of the url created by using the rules specified in the configuration of the extension

### Configuration
* specify the name of the dedicated bookmark folders where the extension keeps its bookmark. The default folder is "Progressive Url Bookmarks"
* specify the lenght of the "small list of the last tracked content" in the popup. The default is 5
* add and remove rules to match & extract data from urls. Sample url: `*//my.streaming.site/series/<title>&lang=en/*/episode<episode>`. The matching logic interprets a rule with the following meaning:
   * any explicit character will be an exact match (it is necessary to specify the domain)
   * `*` is a wildcard that matches every character except `/`
   * `<title>` is the placeholder for the content's title. Note that it cannot be directly preceded or followed by `*`. It matches every character except `/`
   * `<episode>` is the placeholder for the content's progression number. Note that it cannot be directly preceded or followed by `*`. It matches every character except `/`
   * the end of the rule is *not* strict, meaning that the matching logic assumes that any character can follow the end of the rule


## Security
* no login
* no data exchange with any server
* every bit of information remains in your computer


## Testing/Debugging

1. create an ad-hoc firefox profile (it should be somewhere near `$HOME/.mozilla/firefox/<hash>.<profile name>/`)
2. install `web-ext` (url ...)
3. to create/add bookmarks: `web-ext run --firefox-profile path/to/profile --keep-profile-changes`
4. to mess with the extension: `web-ext run --firefox-profile path/to/profile` so that you can add/remove bookmarks with the extension without actually removing anything since at the next restart every change will be discarded (aka you won't need to add again a bunch of bookmarks in order to test the extension)
