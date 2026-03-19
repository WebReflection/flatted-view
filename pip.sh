#!/usr/bin/env sh

# to use this env type either:
# . env.sh
# or
# source env.sh

python -m venv env
source env/bin/activate
pip install --upgrade pip
pip install setuptools wheel twine

echo "
import os
# os.unlink(__file__)

from setuptools import setup, find_packages

with open('../package.json', 'r') as pkg:
  import json
  version = json.load(pkg)['version']

setup(
  name='flatted_view',
  version=version,
  packages=find_packages(),
  description='A flatted alternative compatible with bytes()',
  author='Andrea Giammarchi',
  install_requires=[],
)

" > setup.py

npm run build:py

if [ "$1" = "publish" ]; then
    python -m twine upload --verbose --repository flatted_view pypi/*
else
    cat setup.py 
fi

rm -f setup.py
