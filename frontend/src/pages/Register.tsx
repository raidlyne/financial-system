import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { useNavigate, Link } from 'react-router';
import { authApi } from '../api/auth';

// Функция валидации пароля
const validatePassword = (password: string): string | null => {
    if (password.length < 6) return 'Минимум 6 символов';
    if (!/[A-Z]/.test(password)) return 'Нужна заглавная буква';
    if (!/[a-z]/.test(password)) return 'Нужна строчная буква';
    if (!/[^a-zA-Z0-9]/.test(password)) return 'Нужен специальный символ (например, !, @, #, _)';
    return null;
};

const Register: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const onFinish = async (values: { username: string; password: string }) => {
        setLoading(true);
        try {
            await authApi.register(values);
            message.success('Регистрация успешна! Теперь войдите.');
            navigate('/sign-in');
        } catch {
            message.error('Такой юзернейм уже существует')
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Card title="Регистрация" style={{ width: 400 }}>
                <Form form={form} name="register" onFinish={onFinish} layout="vertical">
                    <Form.Item name="username" label="Юзернейм" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Пароль"
                        rules={[
                            { required: true, message: 'Введите пароль' },
                            {
                                validator: (_, value) => {
                                    const error = validatePassword(value || '');
                                    return error ? Promise.reject(new Error(error)) : Promise.resolve();
                                }
                            }
                        ]}
                        hasFeedback
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Повторите пароль"
                        dependencies={['password']}
                        hasFeedback
                        rules={[
                            { required: true, message: 'Повторите пароль' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Пароли не совпадают'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            disabled={!form.isFieldsTouched(true) || !!form.getFieldsError().filter(({ errors }) => errors.length).length}
                        >
                            Зарегистрироваться
                        </Button>
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                            Уже есть аккаунт? <Link to="/sign-in">Войти</Link>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Register;