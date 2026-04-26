/**
 * Базовый абстрактный класс для всех тестов.
 * Содержит только имя и метод run().
 */
export abstract class TestCase {
    constructor(public readonly name: string) {}

    /**
     * Запускает логику теста. Должен бросать ошибку при провале.
     */
    abstract run(): Promise<void>;
}
