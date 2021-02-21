const Main = imports.ui.main;

function generate_color() {
    let red = Math.floor(Math.random()*255).toString(16);
    if (red.length == 1) red = "0" + red;
    let blue = Math.floor(Math.random()*255).toString(16);
    if (blue.length == 1) blue = "0" + blue;
    let green = Math.floor(Math.random()*255).toString(16);
    if (green.length == 1) green = "0" + green;
    return "#" + red + blue + green;
}

function convertTime(time){
    time = Math.floor(time / 60);
    hours = Math.floor(time / 60);
    minutes = time - (hours*60);
    if (minutes < 10) {
        minStr = "0" + minutes.toString();
    } else {
        minStr = minutes.toString();
    }
    if (hours < 10){
      hourStr = " " + hours.toString();
    } else {
      hourStr = hours.toString();
    }
    return hourStr + ":" + minStr;
}

function calcTotal(weekdays){
  var totalMax = 0;
  var totalCurr = 0;
  for (var i in weekdays){
    totalCurr += parseInt(weekdays[i].split("/")[0].split(":")[0]*60*60) + parseInt(weekdays[i].split("/")[0].split(":")[1]*60);
    totalMax += parseInt(weekdays[i].split("/")[1].split(":")[0]*60*60) + parseInt(weekdays[i].split("/")[1].split(":")[1]*60);
  }
  return convertTime(totalCurr) + "\n" + convertTime(totalMax);
}

function updateWeeklyTimes(weekdays, day, currTime, totalTime, lastStop){
    switch(day) {
      case 0:
        weekdays.sunday = convertTime(currTime) + "/" + convertTime(totalTime) + "/" + convertTime(lastStop);
        break;
      case 1:
        weekdays.monday = convertTime(currTime) + "/" + convertTime(totalTime) + "/" + convertTime(lastStop);
        break;
      case 2:
        weekdays.tuesday = convertTime(currTime) + "/" + convertTime(totalTime) + "/" + convertTime(lastStop);
        break;
      case 3:
        weekdays.wednesday = convertTime(currTime) + "/" + convertTime(totalTime) + "/" + convertTime(lastStop);
        break;
      case 4:
        weekdays.thursday = convertTime(currTime) + "/" + convertTime(totalTime) + "/" + convertTime(lastStop);
        break;
      case 5:
        weekdays.friday = convertTime(currTime) + "/" + convertTime(totalTime) + "/" + convertTime(lastStop);
        break;
      case 6:
        weekdays.saturday = convertTime(currTime) + "/" + convertTime(totalTime);
        break;
    }
    return weekdays;
}

function elapsedTimeInSeconds(date){
  now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / 1000);
}

function isSameDay(date){
  now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDay() === now.getDay();
}

function isNewWeek(date){
  if (!isSameDay(date)){
    var today = (new Date()).getDay();
    var lastDay = date.getDay();
    var diffDays = Math.round(Math.abs((new Date() - date)/(24*60*60*1000)));
    if (today == 0) {today = 7};
    if (lastDay == 0) {lastDay = 7};
    if (today <= lastDay || diffDays > 7){
      return true;
    }
  }
  return false;
}

function addNewLines(text){
  var POS = 60;
  if (text.length > POS){
    var count = 1;
    var newText = "";
    var lineText = "";
    var words = text.split(" ");
    for (var i = 0; i < words.length; i++){
      if (!(lineText.length + words[i].length + 1 > POS)){
        lineText += " " + words[i];
      } else if (words[i].length > POS){
        var slice = POS - newText.length - 1;
        lineText += " " + [words[i].slice(0, slice), "-"].join("");
        newText += lineText + "\n ";
        lineText = [words[i].slice(slice)];
      } else {
        newText += lineText + "\n ";
        lineText = words[i];
      }
    }
    newText += lineText;
    return newText;
  } else {
    return text;
  }
}
