(function ($) {
    "use strict";
    var nav = $('nav'),
        sound = $("#jingle_bell")[0],
        pauseBtn = $(".sound_toggle_btn"),
        myIndex = 0;
    /* navOffset ends */


    //site music control js
    var playing = false;
    pauseBtn.on('click', function () {
        $(this).children('span').toggleClass('fa fa-play fa fa-pause');
        if (playing == true) {
            sound.play();
            playing = "false";
        } else {
            sound.pause();
            playing = true;
        }

    });

    // DEFAULT VOLUME
    sound.volume = '0.9';
    $('.slider-input').on('change', function () {
        var getValue = $(this).val() / 10;
        sound.volume = getValue;
    });

   

})(jQuery);