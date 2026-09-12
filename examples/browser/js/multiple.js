
(function($) {

    $(document).ready(()=>{

        Jocly.listGames().then((games)=>{

            for(let gameName in games) {
                var game = games[gameName];

                $("<div>")
                    .addClass("game-descr")
                    .css({
                        backgroundImage: "url('"+game.thumbnail+"')"
                    })
                    // Both fields may be a string or an object indexed by
                    // locale (see Localized() in control.js). Printing the
                    // object gives "[object Object]", which is what this page
                    // did for every translated summary.
                    .append($("<div>").addClass("game-descr-name").text(Text(game.title)))
                    .append($("<div>").addClass("game-descr-summary").text(Text(game.summary)))
                    .on("click",()=>{
                        StartGame(gameName);
                    }).appendTo($("#game-list"));
            }

        });

    });

    function StartGame(gameName) {
        var area = $("<div>").addClass("game-area-mini");
        $("<div>").addClass("game-area-mini-cont").append(area).appendTo($("body"));

        // La forme minimale de Localized() de control.js : cette page-ci n'a pas de
// selecteur de langue, elle suit celle du navigateur et retombe sur l'anglais.
function Text(field) {
    if(field == null) return "";
    if(typeof field == "string") return field;
    var lang = (navigator.language || "en").split("-")[0];
    return field[lang] || field.en || Object.values(field)[0] || "";
}

function NotifyWinner(winner) {
            var txt = "?";
            if(winner==Jocly.PLAYER_A)
                txt = "Player A wins";
            else if(winner==Jocly.PLAYER_B)
                txt = "Player B wins";
            else if(winner==Jocly.DRAW)
                txt = "Draw";
            alert(txt);
        }

        function RunMatch(match, progressBar) {
            function NextMove() {
                match.getTurn()
                    .then( (player) => {
                        var promise;
                        if(player==Jocly.PLAYER_A) 
                            promise = match.userTurn();
                        else {
                            if(progressBar) {
                                progressBar.style.display = "block";
                                progressBar.style.width = 0;
                            }
                            promise = match.machineSearch({
                                        progress: (progress) => {
                                            if(progressBar)
                                                progressBar.style.width = progress +"%";
                                        }
                                    })
                                .then( (result) => {
                                    return match.playMove(result.move);
                                })
                                .then( () => {
                                    if(progressBar)
                                        progressBar.style.display = "none";            
                                });
                        }
                        promise.then( () => {
                                return match.getFinished()
                            })
                            .then( (result) => {
                                if(result.finished)
                                    NotifyWinner(result.winner);
                                else
                                    NextMove();
                            });
                    })
            }
            NextMove();
        }

        Jocly.createMatch(gameName).then((match) => {
            match.attachElement(area[0])
                .then( () => {
                    RunMatch(match);
                });
        });

    }

})(jQuery);
