var fs      = require('fs'),
	chalk	= require('chalk'),
	request = require('request'),
	cheerio = require('cheerio'),
	PinIt   = require('pin-it-node'),
	user    = process.argv[2],
	page    = 0,
	last    = 0,
	url     = 'http://ffffound.com/home/' + user + '/found/',
	data    = [],
	checked = 0,
	errors  = [],
	ercount = 0,

	pinurl  = 'http://www.pinterest.com/' + process.argv[3],
	board   = '',
	pinIt   = new PinIt({
		username: process.argv[4],
		password: process.argv[5]
	})
	pinned  = 0;

// ffffound

var scrap_your_ffffound_account = function(url) {

	var next;

	request(url, function (error, response, html) {

		if (!error) {
			var $ = cheerio.load(html);

			if(!last) {
				if ($('span.paging a').last().attr('href').indexOf('javascript') > -1) {
					last = parseFloat($('span.paging a').last().attr('href').split(',')[2].trim()) + 1
				} else {
					last = $('span.paging a').last().text().trim()
				}
			}

			$('blockquote.asset').each(function(index, element){

				var image = 'http://' + $(this).find('.description').html().split('<br>')[0].split('?')[0],
					filename = image.split('/')[image.split('/').length - 1].split('?')[0];

				var item = {
					ffffound: {
						url: $(this).children('div').eq(1).find('td').eq(0).find('a').attr('href'),
						image: $(this).children('div').eq(1).find('td').eq(0).find('img').attr('src')
					},
					original: {
						title: $(this).find('.title a').text(),
						url: $(this).find('.title a').attr('href'),
						image: image,
						filename: filename
					},
					status: {
						todo: 0, // 0: to do, 1: done, 2: later
						code: 0, // 0: unchecked, 1: ok, 2: use ffffound image
						error: {
							code: 0,
							message: ''
						}
					}
				}

				data.push(item);
			});

			console.log(chalk.bgWhite('ffffound'), chalk.bgGreen('success'), 'Scrapped #' + (page + 1) + ' of your ' + last + ' ffffound pages.');

			try {
				next = $('#paging-next').attr('href').slice(2) || undefined;
			} catch(Error) {}

			page++;

			if(next) {
				url = url.split('?')[0] + next;
				scrap_your_ffffound_account(url);
			} else {
				write_to_file('data', data, 'Saved your ffffound data to a tidy json file.');
				// it_is_time_to_get_the_board_id();
				check_integrity();
			}
		}

	});

}

var check_integrity = function(){
	if(checked < data.length) {
		var item = data[checked];

		request(item.original.image, function(error, response, html){

			var msg;

			if(response){
				if(response.headers){
					if(response.headers['content-type']){
						if(response.headers['content-type'].indexOf('image') > -1) {
							data[checked].status.code = 1;
							msg = chalk.bgGreen('seems ok.');
						} else {
							data[checked].status.code = 2;
							msg = chalk.bgRed('probably moved or is lost in the ether.');
						}
					} else {
						data[checked].status.code = 2;
						msg = chalk.bgBlue(' ... i have no clue about.');
					}
				} else {
					data[checked].status.code = 2;
					msg = chalk.bgBlue(' ... i have no clue about.');
				}
			} else {
				data[checked].status.code = 2;
				msg = chalk.bgBlue(' ... i have no clue about.');
			}

			console.log(chalk.bgWhite('check'), chalk.underline('#'+(checked+1)+'/'+data.length), 'This one', msg)

			checked++;
			check_integrity();
		});
	} else {
		write_to_file('data', data, 'Updated your ffffound data.');
		it_is_time_to_get_the_board_id();
	}
}

// pinterest

var it_is_time_to_get_the_board_id = function() {
	request(pinurl, function (error, response, html) {
		if (!error) {


			var regex = /"board_id": "(\d+)"/g;
				board = regex.exec(html)[1];

			and_now_pin_your_ffffound_images_to_pinterest();
		}
	});
}

var and_now_pin_your_ffffound_images_to_pinterest = function() {
	if(pinned < data.length) {

		var item = data[pinned];

		if(item.status.todo === 0) {

			var image = item.status.code === 1 ? item.original.image : item.ffffound.image;
			var page = item.status.code === 1 ? item.original.url : item.ffffound.url;

			pinIt.pin({
				boardId: board,
				url: item.original.url,
				description: item.original.title,
				media: image
			}, function (err, pinObj) {

				if (err) {

					data[pinned].status.error.code = err;

					if(err === 400) {
						err = chalk.bgRed('Image probably lost due to digital decay.');
						data[pinned].status.todo = 2;
					}

					if(err === 401) {
						err = chalk.bgRed('Probably to many pin actions for the moment.');
						data[pinned].status.todo = 0;
					}

					if(err === 429) {
						err = chalk.bgRed('hehe - you have been recognized as a spam bot by pinterest.');
					}

					data[pinned].status.error.message = err;

					console.log(chalk.bgWhite('pinterest'), chalk.bgRed('error'), 'Got an error with', chalk.underline('#' + (pinned + 1)) + ': ' + err);

					errors.push(item);

					if((data[pinned].status.error.code === 401 || data[pinned].status.error.code === 429)){
						ercount++;
					}

					if(ercount > 10) {
						console.log(chalk.bgWhite('pinterest'), chalk.bgRed('abort'), 'Too many errors. Probably blocked for a while. Continue later with -continue');
											
						write_to_file('data', data, 'Saved your ' + chalk.underline('updated') + ' leftovers data.');

						return;
					}
				} else {
					console.log(chalk.bgWhite('pinterest'), chalk.bgGreen('success'), chalk.underline('#' + (data.length - pinned)) + ' to go.');
					data[pinned].status.todo = 1;
					data[pinned].status.error.code = 0;
					data[pinned].status.error.message = '';
					ercount = 0;
				}

				pinned++;
				and_now_pin_your_ffffound_images_to_pinterest();
			});
		} else {
			pinned++;
			and_now_pin_your_ffffound_images_to_pinterest();
		}
	} else {
		write_to_file('data', data, chalk.underline('Finished') + ' and saved your ffffound data.');
	}
}

// file handling

var write_to_file = function(filename, d, message) {
	fs.writeFile('ffffound/'+filename+'.json', JSON.stringify(d, null, 4), function(err) {
		if(err) {
			console.log(err);
		} else {
			console.log(message);
		}
	});
}

var read_that_file = function(filename, callback) {
	fs.readFile('./ffffound/'+filename+'.json', 'utf8', function (err, d) {
		if (err) {
			console.log('Error: ' + err);
			return;
		}

		data = JSON.parse(d);
		callback();
	});
}

// init

if(process.argv[2] === '-continue') {
	read_that_file('data', it_is_time_to_get_the_board_id);
} else if(process.argv[2] === '-check') {
	read_that_file('data', check_integrity);
} else {
	scrap_your_ffffound_account(url);
}