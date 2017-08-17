![ffffinterest](http://i.imgur.com/8Si2vrG.jpg)


# lost ...

... is a ffffound to pinterest copy-script.

- install node
- go to lost.js directory
- command: npm install
- command: node lost [ffffound username] [pinterest username/board name] [pinterest email] [pinterest password]
- wait ...

_example_

	node lost monkee thgiex/lost y@thgie.ch myp455word

if the script aborts because you got temporary blocked (happened to me alot, like after every 200 images ...) you can continue later with

	node lost -continue [pinterest username/board name] [pinterest email] [pinterest password]

the script will save the state of your metadata at a clean abort.

the board has to exist and be public. naturally some images wont work because of digital decay.

_how it works_

1. go throught all your ffffound pages and get the metainfo of each item: original page and image url as well as ffffound page and image url
2. check integrity of your ffffound metadata. some images might have moved or the site doesn't exist anymore. in that case the script will pin the ffffound page and image.
3. get on with pinning it to your designated pinterest board.


successfully tested with my own somewhat 2600 images (after a while of tweaking)