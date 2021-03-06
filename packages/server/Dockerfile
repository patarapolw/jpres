# Based on debian-slim
FROM postgres:12

RUN mkdir -p /app
RUN apt-get update

# pgroonga extension
# Does not officially support alpine
RUN apt-get install -y curl
RUN curl -O https://packages.groonga.org/debian/groonga-apt-source-latest-buster.deb
RUN apt-get install -y ./groonga-apt-source-latest-buster.deb
RUN echo "deb http://apt.postgresql.org/pub/repos/apt/ buster-pgdg main" | tee /etc/apt/sources.list.d/pgdg.list
RUN curl -sSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
RUN apt-get update
RUN apt-get install -y postgresql-12-pgdg-pgroonga
RUN apt-get install -y groonga-tokenizer-mecab
RUN apt-get install -y groonga-token-filter-stem

# postgres-json-schema extension
WORKDIR /app
RUN apt-get install -y git make
RUN git clone --depth 1 https://github.com/gavinwahl/postgres-json-schema.git
RUN cd postgres-json-schema && make install

# Install nodejs 12
WORKDIR /app
RUN apt-get install -y dirmngr apt-transport-https lsb-release ca-certificates
RUN curl -sSL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y nodejs gcc g++ make

RUN npm i -g yarn
RUN apt-get install -y mecab mecab-ipadic-utf8 python3 python3-pip
RUN touch /usr/local/etc/mecabrc
COPY requirements.txt ./
RUN pip3 install -r requirements.txt
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile
COPY . .
COPY initdb.d/ /docker-entrypoint-initdb.d/
RUN yarn build
RUN yarn --frozen-lockfile --production

ENTRYPOINT ["/bin/bash", "-e", "init.sh"]
