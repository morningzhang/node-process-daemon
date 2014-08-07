/**
 * Created by zhangliming on 14-8-7.
 */

var pidFile={
    pidFolder:'../pids/',
    pidSuffix:'_pid',

    writePids:function(role,pids){
        var pidStr=pids.join(',');
        fs.writeFileSync(this.pidFolder+role+this.pidSuffix,pidStr,{flag:'w+'});
    },
    replacePid:function(role,oldPid,newPid){
        var fileName=this.pidFolder+role+this.pidSuffix;
        var lockFileName=this.pidFolder+role+'.lock';
        try{
            lockFile.lockSync(lockFileName);
            fs.writeFileSync(fileName,fs.readFileSync(fileName).toString().replace(oldPid,newPid));
        }finally{
            lockFile.unlockSync(lockFileName);
        }

    }
};


if (cluster.isMaster) {
    loggerModule.configure('master');
    var masterLogger = loggerModule.logger('main');

    var workerPids=[];
    for (var i = 0; i < numCPUs; i++) {
        var worker=  cluster.fork();
        workerPids.push(worker.process.pid);
        onExitFork(masterLogger,worker);
    }
    //write pid
    pidFile.writePids('master',[process.pid]);
    pidFile.writePids('worker',workerPids);

    masterLogger.info('Master Server started with pid[%d].', process.pid);

} else {
    httpServer.http_server(cluster.worker).listen(8000);
}

function onExitFork(logger,worker,maxFork){
    //A default value
    maxFork=maxFork||1000000;

    worker.on('exit', function () {
        maxFork = maxFork - 1;
        if (maxFork < 0){
            return;
        }
        var oldPid=worker.process.pid;
        //refork
        worker = cluster.fork();

        var newPid=worker.process.pid;

        pidFile.replacePid('worker',oldPid,newPid);

        logger.info('Old worker pid[%d] died and new worker pid[%d] started and still left %d times to be forked.',oldPid,newPid,maxFork);
        onExitFork(logger, worker, maxFork);
    });
}