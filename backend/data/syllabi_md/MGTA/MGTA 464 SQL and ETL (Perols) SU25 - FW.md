

# **SQL Programming** 

Summer 2025 

|PROFESSOR:|Johan Perols|
|---|---|
|EMAIL:|jperols@ucsd.edu|
|ROOM:|Remote andOTRSN 1E107|
|TIME:|July 12 (remote), July 26 (remote), Aug 9 (in-person), Aug 23 (in-<br>person), and Sep 6 (in-person), 8:00am-12:00pm|
|OFFICE HOURS:|I am available via email andPiazza 7 days a week. Piazza is the most|
||effective way to get help. Zoom sessions are scheduled when needed.|
|TEACHING ASSISTANT:|Joshiga Ravichandiran (jravichandiran@ucsd.edu)|



## **DESCRIPTION** 

Most organizations store their transaction data, e.g. sales, purchases, production, etc., in relational databases. While other data sources such as social media, messaging data, and machine sensors, are also increasing in importance, the data stored in relational databases are often of central importance in business analytics projects. To access and analyze data in relational databases and most other data repositories containing structured data, business analytics professionals need knowledge of SQL (Structured Query Language). Consequently, SQL is one of the most sought after skills (typically ranked as a top three skill) by recruiters that hire business analytics professionals (Radovilsky et al. 2018; Stanton and Stanton 2020). In this course, you will learn how to write SQL statements to extract and transform data. You will also be introduced to ETL (Extract, Transform, and Load) concepts via a Python/Snowflake project. 

## **OBJECTIVES** 

At the close of this course, you will be able to: 

- query databases using various SQL commands 

   - basic commands, including: 

      - SELECT, FROM, INNER JOIN, LEFT JOIN, WHERE (including AND, OR, BETWEEN, LIKE with wild cards, IS NULL and IS NOT NULL), ORDERBY, OFFSET and LIMIT, calculated fields (including CASE WHEN), GROUP BY, aggregate functions, HAVING, DISTINCT, and IN, 

   - intermediate commands, including: 

      - GROUPING SETS, ROLLUP, and CUBE, 

      - UNION, INTERSECT, EXCEPT, VIEWs, 

      - subquery functions (EXISTS, IN, NOT IN, ANY/SOME, and ALL), 

      - FILTER, 

      - EXTRACT, and DATE_TRUNC 

      - Working with strings, including LEFT, RIGHT, LENGTH, TRIM, POSITION, STRPOS, SUBSTR, CONCAT, UPPER, and LOWER 

   - more advanced commands, including 

      - Windowing (OVER CLAUSE), including ORDER BY, PARTITION BY, frame specifications (e.g., ROWS, RANGE, GROUPS, PRECEDING, FOLLOWING, and EXCLUDE) and windowing functions (e.g., row number, rank, dense_rank, lag, lead, first_value, last_value, and nth_value) 

      - Common Table Expressions and Recursive Queries 

      - Pattern matching, including LIKE, SIMILAR TO ~~, and REGEX~~ 

      - Fuzzy string matching, including soundex and Levenshtein 

- use Python and Snowflake to extract, load, and transform data 

   - connect to and extract PostgreSQL data using Python 

   - create Snowflake warehouse, schema, database, stage, file format, table, and view objects using Python 

   - load XML, csv, and txt into Snowflake and transform loaded data inside Snowflake using Python 

© Johan Perols, 2023. Do not copy or distribute without permission. 



## **MATERIALS** 

PowerPoint slides, assignments, assigned readings, recordings of live lectures, etc. will be posted on the course website. The course website will also contain recorded tutorials that goes through the takehome assignments. These resources (the content posted on the course website and the recorded tutorials) are the only resources that you need in the course. 

## **ASSIGNMENTS** 

Four assignments focus on SQL SELECT statements. These assignments are ungraded (no submission needed) that you will work on in class and at home.  The SQL assignments are followed by graded individual skills tests that I use to evaluate your knowledge of SQL. The skills tests contain problems related to the specific skills learned in the assignments. The completion and understanding of the assignments will prepare you for the skills test. While the skills test are closed books, you will be provided with a summary of the various SQL statements you have previously learned. 

The sixth assignment, the ETL case, consists of ungraded tutorials and a graded group project. The tutorials introduce Snowflake and explains how to administer Snowflake using Python.  The case requires the use of Python to create various Snowflake objects including warehouse, schema, database, stage, file format, table, and view objects, and to extract, load, and transform monthly purchase order data stored from csv files, supplier invoice XML data, weather data from Snowflake Marketplace, supplier information from a postgres database, and zip code/geolocation data from the Internet. 

## **Class Participation** 

I expect everyone to attend class and participate in class activities. However, attendance and participation do not affect your grade. 

## **Class Structure** 

Classes are in-person. A typical class starts with a proctored assessment. The assessment is followed by lecture/live coding that introduces important concepts for the next assignment. You are then expected to work on the next assignment and review recorded tutorials outside of class to prepare for the next assessment. 

There is no book to purchase and all content is accessible through the course web site. I do not have scheduled office hours, but I am available for help throughout the week (including on weekends). For additional help, Piazza and email are the quickest and most effective way to communicate with me. 

## **<u>GRADING</u>** 

|Assignments|Points [or percentage]|
|---|---|
|SQL Skills Test 1|22.5|
|SQL Skills Test 2|22.5|
|SQL Skills Test 3|22.5|
|SQL Skills Test 4|22.5|
|ETL Assignment|10|
|Total|100|



## **<u>SCHEDULE</u>** 

|Date|Class Topic & Activities|
|---|---|
|Module 1|• Course Introduction (syllabus)<br>• Introduction to SQL (lecture)<br>• SQL Assignment 1 (no deliverable, collaboration allowed):<br>-Introduction to basic SQL commands, including:<br>SELECT, FROM, INNER JOIN, LEFT JOIN, WHERE (including AND, OR,|
||BETWEEN, LIKE with wild cards, IS NULL and IS NOT NULL), ORDER BY, LIMIT,|



© Johan Perols, 2025. Do not copy or distribute without permission. 



||calculated fields (including CASE WHEN), GROUP BY, aggregate functions (AVG<br>and SUM), HAVING, view and subqueries|
|---|---|
|Module 2|•**Skills Test 1**(SQL Assignment 1) (individual)<br>• SQL Assignment 2 (no deliverable, collaboration allowed):<br>-NULL VALUES in PostgreSQL and COALESCE<br>-More SELECT statement commands, including:<br>`o`DISTINCT, WHERE IN, and FILTER<br>`o`Date functions: EXTRACT, and DATE_TRUNC<br>~~`o` Crosstab function~~<br>`o`Limiting the result set using OFFSET AND LIMIT<br>`o`Common Table Expressions<br>`o`Combining data by stacking: UNION, UNION ALL, INTERSECT, and EXCEPT|
|Module 3|•**Skills Test 2**(SQL Assignment 2) (individual)<br>• SQL Assignment 3 (no deliverable, collaboration allowed):<br>`o`Recursive Common Table Expressions<br>`o`Subquery expression functions: EXISTS, IN, NOT IN, ANY/SOME, and ALL<br>`o`Additional GROUP BY operators: GROUPING SETS, ROLLUP, and CUBE|
|Module 4|•**Skills Test 3**(SQL Assignment 3) (individual)<br>• SQL Assignment 4 (no deliverable, collaboration allowed):<br>`o`<br>Windowing (OVER CLAUSE), including ORDER BY, PARTITION BY, frame<br>specifications (e.g., ROWS, RANGE, GROUPS, PRECEDING, FOLLOWING ,<br>and EXCLUDE), and window functions (e.g., row number, rank, dense_rank,<br>lag, lead, first_value, last_value, and nth_value)<br>`o`<br>Working with strings: LEFT, RIGHT, LENGTH, TRIM, POSITION, STRPOS,<br>SUBSTR, CONCAT, UPPER, and LOWER<br>`o`<br>Pattern matching: LIKE, SIMILAR TO~~, and REGEX~~<br>`o`<br>Fuzzy string matching: soundex and Levenshtein|
|Module 5|•**Skills Test 4**(SQL Assignment 4) (individual)<br>•**ETL Case**– Python and Snowflake (group) (DUE: 9/10/2025)<br>use Python to:<br>`o`<br>connect to and extract PostgreSQL data<br>`o`<br>create various Snowflake objects including warehouse, schema, database,<br>stage, file format, table, and view objects<br>`o`<br>load and transform XML, csv, and txt files in Snowflake|



* Bolded items are graded. 

## **ACADEMIC INTEGRITY** 

Integrity of scholarship is essential for an academic community. As members of the Rady School, we pledge ourselves to uphold the highest ethical standards. The University expects that both faculty and students will honor this principle and in so doing protect the validity of University intellectual work. For students, this means that all academic work will be done by the individual to whom it is assigned, without unauthorized aid of any kind. 

The complete UCSD Policy on Integrity of Scholarship can be viewed at: <u>http://senate.ucsd.edu/Operating-Procedures/Senate-Manual/Appendices/2</u> 

## **STUDENTS WITH DISABILITIES** 

A student who has a disability or special need and requires an accommodation in order to have equal access to the classroom must register with the Office for Students with Disabilities (OSD). The OSD will determine what accommodations may be made and provide the necessary documentation to present to the faculty member. 

© Johan Perols, 2025. Do not copy or distribute without permission. 



The student must present the OSD letter of certification and OSD accommodation recommendation to the appropriate faculty member in order to initiate the request for accommodation in classes, examinations, or other academic program activities. **No accommodations can be implemented retroactively.** 

Please visit the OSD website for further information or contact the Office for Students with Disabilities at (858) 534-4382 or **osd@ucsd.edu.** 

© Johan Perols, 2025. Do not copy or distribute without permission. 

