from __future__ import annotations
import abc
import typing


from ...core import app
from ...core import entities as core_entities
from ...platform.types import message as platform_message


preregistered_strategies: list[typing.Type[LongTextStrategy]] = []


def strategy_class(
    name: str,
) -> typing.Callable[[typing.Type[LongTextStrategy]], typing.Type[LongTextStrategy]]:
    """Long text processing strategy class decorator

    Args:
        name (str): Strategy name

    Returns:
        typing.Callable[[typing.Type[LongTextStrategy]], typing.Type[LongTextStrategy]]: Decorator
    """

    def decorator(cls: typing.Type[LongTextStrategy]) -> typing.Type[LongTextStrategy]:
        assert issubclass(cls, LongTextStrategy)

        cls.name = name

        preregistered_strategies.append(cls)

        return cls

    return decorator


class LongTextStrategy(metaclass=abc.ABCMeta):
    """Long text processing strategy abstract class"""

    name: str

    ap: app.Application

    def __init__(self, ap: app.Application):
        self.ap = ap

    async def initialize(self):
        pass

    @abc.abstractmethod
    async def process(self, message: str, query: core_entities.Query) -> list[platform_message.MessageComponent]:
        """Process long text

        If the text length exceeds the threshold, this method will be called.

        Args:
            message (str): Message
            query (core_entities.Query): Query object

        Returns:
            list[platform_message.MessageComponent]: Converted platform message components
        """
        return []
