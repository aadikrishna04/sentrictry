from setuptools import setup, find_packages

setup(
    name="sentric",
    version="0.1.0",
    description="Security observability for AI browser agents",
    author="Sentric",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
        "websocket-client>=1.5.0",
    ],
    python_requires=">=3.9",
)
