export const sasjsout = `%macro sasjsout(type,fref=sasjs);
%global sysprocessmode SYS_JES_JOB_URI;
%if "&sysprocessmode"="SAS Object Server" %then %do;
  %if &type=HTML %then %do;
    filename _webout filesrvc parenturi="&SYS_JES_JOB_URI" name="_webout.json"
      contenttype="text/html";
  %end;
  %else %if &type=JS %then %do;
    filename _webout filesrvc parenturi="&SYS_JES_JOB_URI" name='_webout.js'
      contenttype='application/javascript';
  %end;
  %else %if &type=CSS %then %do;
    filename _webout filesrvc parenturi="&SYS_JES_JOB_URI" name='_webout.js'
      contenttype='text/css';
  %end;
%end;
%else %do;
  %if &type=JS %then %do;
    %let rc=%sysfunc(stpsrv_header(Content-type,application/javascript));
  %end;
  %else %if &type=CSS %then %do;
    %let rc=%sysfunc(stpsrv_header(Content-type,text/css));
  %end;
%end;
data _null_;
  infile &fref RECFM=N;
  file _webout RECFM=N;
  input string $CHAR1. @;
  put string $CHAR1. @;
run;
%mend;`;
