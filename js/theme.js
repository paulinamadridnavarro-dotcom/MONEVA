// Estilo de las gráficas acorde al tema: tipografía del sistema, rejilla tenue y leyendas con puntos.
if(typeof Chart!=='undefined'){const d=Chart.defaults;
d.font.family='-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';d.font.size=12;d.color='#6E6E73';d.borderColor='rgba(60,60,67,.10)';
d.plugins.legend.labels.usePointStyle=true;d.plugins.legend.labels.pointStyle='circle';d.plugins.legend.labels.boxWidth=8;d.plugins.legend.labels.boxHeight=8;d.plugins.legend.labels.padding=14;
Object.assign(d.plugins.tooltip,{backgroundColor:'rgba(29,29,31,.88)',padding:10,cornerRadius:10,titleFont:{weight:'600'},boxPadding:4,usePointStyle:true});
d.elements.arc.borderColor='rgba(255,255,255,.9)';d.elements.arc.borderWidth=2;d.elements.bar.borderSkipped='start';d.elements.line.tension=.35;
d.scale.grid.drawTicks=false;d.scale.border={display:false};d.datasets.doughnut.cutout='66%';}
