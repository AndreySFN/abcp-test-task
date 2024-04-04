import React, { useState, useEffect, memo, useCallback, useRef } from "react"; // Добавлены необхожимые импорты

type Nullable<T> = T | null; // Добавлен новый тип. В идеале должен распологаться не тут, а в соответствии со структурой проекта
function useThrottle<T extends any[]>(
  callback: (...args: T) => void,
  delay: number
): [boolean, (...args: T) => void] {
  const [isThrottled, setIsThrottled] = useState(false);
  const lastCall = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: T) => {
      const now = Date.now();
      if (now - lastCall.current > delay) {
        callback(...args);
        lastCall.current = now;
        setIsThrottled(false);
      } else {
        setIsThrottled(true);
        setTimeout(() => {
          setIsThrottled(false);
          lastCall.current = now;
          callback(...args);
        }, delay - (now - lastCall.current));
      }
    },
    [callback, delay]
  );

  return [isThrottled, throttledCallback];
}

function useCache<T>(callback: (id: number) => Promise<T>) {
  // Добавлен кэш. Аналогично, касательно расположения
  const [cache, setCache] = useState<{ [key: number]: T }>({});
  return async (id: number): Promise<T> => {
    if (cache[id]) {
      return cache[id];
    } else {
      const data = await callback(id);
      setCache((prevCache) => ({ ...prevCache, [id]: data }));
      return data;
    }
  };
}

const URL = "https://jsonplaceholder.typicode.com/users";

const SECOND_MS = 1000;

type Company = {
  // Изменён порядок свойств в соответствии с результатом, возвращаемым API
  name: string;
  catchPhrase: string;
  bs: string;
};

type Geo = {
  // Добавлен новый тип
  lat: number;
  lng: number;
};

type Address = {
  // Добавлен новый тип
  street: string;
  suite: string;
  cite: string;
  zipcode: string;
  geo: Geo;
};

type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  username: string;
  website: string;
  company: Company;
  address: Address; // типизировано значение
};

interface IButtonProps {
  disabled?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void; // Значение типизировано
}

const Button = memo(
  ({
    onClick,
    disabled,
  }: IButtonProps): JSX.Element => ( // компонент обёрнут в memo
    <button disabled={disabled} type="button" onClick={onClick}>
      get random user
    </button>
  )
);

interface IUserInfoProps {
  user: Nullable<User>; // user может быть null
}

const UserInfo = memo(({ user }: IUserInfoProps): JSX.Element => {
  return (
    <table>
      <thead>
        <tr>
          <th>Username</th>
          <th>Phone number</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{user?.name || "-"}</td>{" "}
          {/* отображаем прочерки, если нет данных пользователя */}
          <td>{user?.phone || "-"}</td>
        </tr>
      </tbody>
    </table>
  );
});

function App(): JSX.Element {
  const [user, setUser] = useState<Nullable<User>>(null); //Тут была неверная типизация. Значчения переименованы для лучшей читаемости.
  const [controller, setController] = useState<AbortController | null>(null); // Аборт-контроллер для обрыва запросов при размонтировании компонента, либо обрыва ещё невыполненного запроса при инициализации нового
  const _handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.stopPropagation();
    const id = Math.floor(Math.random() * 10) + 1;
    receiveUser(id).then((user: Nullable<User>): void => {
      user && setUser(user);
    });
  };

  const [isThrottled, handleButtonClick] = useThrottle(
    _handleButtonClick,
    SECOND_MS
  );
  useEffect(() => {
    // Обрываем запрос при размонтировании компонента
    return () => {
      controller?.abort();
    };
  }, [controller]);

  const _reveiveUser = async (id: number): Promise<Nullable<User>> => {
    // Функция принимает, а не генерирует id, а так же возвращает пользователя

    controller?.abort(); // Отмена предыдущего запроса, если он существует
    const newController = new AbortController(); // Создание нового AbortController для нового запроса
    setController(newController);

    try {
      // Запрос обёрнут в try/catch
      const response = await fetch(`${URL}/${id}`, {
        signal: newController.signal,
      });
      if (!response.ok) throw new Error("Network response was not ok");
      const userData = (await response.json()) as User;
      return userData;
    } catch (error: unknown) {
      // Добавлен вывод ошибок fetch в консоль
      console.error("Fetch error:", error);
      return null;
    }
  };

  const receiveUser = useCache<Nullable<User>>(_reveiveUser);

  return (
    <div>
      <header>Get a random user</header>
      <Button disabled={isThrottled} onClick={handleButtonClick} />{" "}
      {/*добавлено отключение кнопки */}
      <UserInfo user={user} />
      {/* можно вовсе не отображать компонент при отсутствии пользователя в таком случае можно не вносить изменения в типизацию и оставить user: User */}
      {/* {user && <UserInfo user={user}/>} */}
    </div>
  );
}

export default App;
