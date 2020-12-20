import React from 'react'
import {Nav, Navbar, NavbarBrand} from "reactstrap";

import './header.scss'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPowerOff} from "@fortawesome/free-solid-svg-icons";
import {faChromecast} from "@fortawesome/free-brands-svg-icons";

const offStrategy = {
    name: 'off',
    params: {}
}

const Header = (props) => {
    console.log(props)
    //return <Navbar fixed light className={'header-bar'}>
    return <Navbar light className={'header-bar ' + (props.status ? 'good' : 'bad')}>

        <div className={'off'}></div>

        <div className={"brand"}>
            <NavbarBrand href="/">Lampe</NavbarBrand>
        </div>


        <div className={`menu-icon mobile d-block d-sm-none ${props.screenEnable ? ' active' : ''}`} onClick={() => props.toggleScreen()}>
            <FontAwesomeIcon icon={faChromecast} />
        </div>

        <div className={'menu-icon off'} onClick={() => props.playHandler(offStrategy)}>
            <FontAwesomeIcon icon={faPowerOff} />
        </div>

    </Navbar>
}

export default Header;